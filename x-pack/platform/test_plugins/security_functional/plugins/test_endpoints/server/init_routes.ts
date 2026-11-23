/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';

import { schema } from '@kbn/config-schema';
import type {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  PluginInitializerContext,
} from '@kbn/core/server';
import { ROUTE_TAG_AUTH_FLOW } from '@kbn/security-plugin/server';
import { restApiKeySchema } from '@kbn/security-plugin-types-server';
import type {
  BulkUpdateTaskResult,
  ConcreteTaskInstance,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

import type { PluginStartDependencies } from '.';

export const SESSION_INDEX_CLEANUP_TASK_NAME = 'session_cleanup';

export function initRoutes(
  initializerContext: PluginInitializerContext,
  core: CoreSetup<PluginStartDependencies>
) {
  const logger = initializerContext.logger.get();

  const authenticationAppOptions = { simulateUnauthorized: false };
  core.http.resources.register(
    {
      path: '/authentication/app',
      validate: false,
    },
    async (context, request, response) => {
      if (authenticationAppOptions.simulateUnauthorized) {
        return response.unauthorized();
      }
      return response.renderCoreApp();
    }
  );

  const router = core.http.createRouter();

  const PREAUTH_HOLD_HEADER = 'x-elastic-preauth-hold';
  const PREAUTH_HOLD_ID_MAX_LENGTH = 64;
  const PREAUTH_HOLD_TIMEOUT_MS = 10_000;
  const PREAUTH_HOLD_PATH_PREFIX = '/authentication/preauth_holds';

  interface PreauthHoldSocketSnapshot {
    authorized: boolean | null;
    peerCertificateNull: boolean;
  }

  interface PreauthHoldState {
    parked: boolean;
    continuedAfterHold: boolean;
    authCompleted: boolean;
    snapshotSocket: () => PreauthHoldSocketSnapshot;
    release: () => void;
  }

  const preauthHolds = new Map<string, PreauthHoldState>();

  const readHoldId = (value: string | string[] | undefined): string | undefined => {
    if (value === undefined) {
      return undefined;
    }
    const holdId = Array.isArray(value) ? value[0] : value;
    if (!holdId || holdId.length > PREAUTH_HOLD_ID_MAX_LENGTH) {
      return undefined;
    }
    return holdId;
  };

  const snapshotSocket = (request: KibanaRequest): PreauthHoldSocketSnapshot => ({
    authorized: request.socket.authorized ?? null,
    peerCertificateNull: request.socket.getPeerCertificate(true) === null,
  });

  // Park inside PKIAuthenticationProvider.authenticate, not onPreAuth.
  // Hapi's request cycle bails when `_isReplied` is set (see @hapi/hapi Request._lifecycle).
  // RST_STREAM during onPreAuth emits `aborted`, Hapi replies immediately, and Auth never runs —
  // so PKI never sees the destroyed-stream socket and the Scout test false-greens.
  // Wrapping the already-loaded provider keeps us inside the in-flight Auth cycle function after
  // session lookup, which is the window that invalidates the shared ES token (kibana#258232).
  const findPkiAuthenticationProvider = () => {
    for (const [moduleId, cached] of Object.entries(require.cache)) {
      const normalizedId = moduleId.replaceAll('\\', '/');
      if (normalizedId.includes('.test.')) {
        continue;
      }
      if (
        !normalizedId.endsWith('/authentication/providers/pki.ts') &&
        !normalizedId.endsWith('/authentication/providers/pki.js')
      ) {
        continue;
      }
      const providerClass = (
        cached?.exports as
          | {
              PKIAuthenticationProvider?: {
                prototype: {
                  authenticate: (request: KibanaRequest, session?: unknown) => Promise<unknown>;
                };
              };
            }
          | undefined
      )?.PKIAuthenticationProvider;
      if (typeof providerClass?.prototype.authenticate === 'function') {
        return providerClass;
      }
    }
    const pkiModules = Object.keys(require.cache)
      .filter((moduleId) => moduleId.includes('pki'))
      .join(', ');
    throw new Error(
      `security-test-endpoints could not locate PKIAuthenticationProvider to install the HTTP/2 preauth hold. pki modules in require.cache: ${
        pkiModules || '(none)'
      }`
    );
  };

  let pkiAuthenticateHoldInstalled = false;
  const installPkiAuthenticateHold = () => {
    if (pkiAuthenticateHoldInstalled) {
      return;
    }

    const pkiProviderClass = findPkiAuthenticationProvider();
    const originalPkiAuthenticate = pkiProviderClass.prototype.authenticate;
    pkiProviderClass.prototype.authenticate = async function wrappedPkiAuthenticate(
      this: unknown,
      request: KibanaRequest,
      session?: unknown
    ) {
      const holdId = readHoldId(request.headers[PREAUTH_HOLD_HEADER]);
      if (!holdId) {
        return originalPkiAuthenticate.call(this, request, session);
      }

      preauthHolds.get(holdId)?.release();

      const deferred: { resolve: () => void } = { resolve: () => undefined };
      const released = new Promise<void>((resolve) => {
        deferred.resolve = resolve;
      });

      const hold: PreauthHoldState = {
        parked: true,
        continuedAfterHold: false,
        authCompleted: false,
        snapshotSocket: () => snapshotSocket(request),
        release: () => deferred.resolve(),
      };
      preauthHolds.set(holdId, hold);

      let timeoutId: NodeJS.Timeout | undefined;
      try {
        await Promise.race([
          released,
          new Promise<void>((resolve) => {
            timeoutId = setTimeout(resolve, PREAUTH_HOLD_TIMEOUT_MS);
          }),
        ]);
      } finally {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
        }
      }

      hold.continuedAfterHold = true;
      try {
        return await originalPkiAuthenticate.call(this, request, session);
      } finally {
        hold.authCompleted = true;
        hold.parked = false;
        // Keep the completed hold around long enough for the test to observe `authCompleted`,
        // then evict so the map does not retain the request (and its socket) indefinitely.
        setTimeout(() => {
          if (preauthHolds.get(holdId) === hold) {
            preauthHolds.delete(holdId);
          }
        }, PREAUTH_HOLD_TIMEOUT_MS).unref();
      }
    };

    pkiAuthenticateHoldInstalled = true;
    logger.info('Installed PKI authenticate preauth hold for HTTP/2 stream-cancel tests.');
  };

  try {
    installPkiAuthenticateHold();
  } catch (err) {
    logger.warn(
      `PKI preauth hold was not installed during setup; will retry at start. ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  void core
    .getStartServices()
    .then(() => installPkiAuthenticateHold())
    .catch((err) => {
      logger.error(
        `PKI preauth hold could not be installed at start; the preauth hold test routes will not function. ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    });

  const unauthenticatedTestRouteSecurity = {
    authc: {
      enabled: false as const,
      reason:
        'This route is part of a security functional test plugin and does not require authentication.',
    },
    authz: {
      enabled: false as const,
      reason: 'This route is opted out from authorization',
    },
  };

  const holdIdParams = {
    params: schema.object({
      id: schema.string({ minLength: 1, maxLength: PREAUTH_HOLD_ID_MAX_LENGTH }),
    }),
  };

  router.get(
    {
      path: `${PREAUTH_HOLD_PATH_PREFIX}/{id}`,
      security: unauthenticatedTestRouteSecurity,
      validate: holdIdParams,
    },
    (_context, request, response) => {
      const hold = preauthHolds.get(request.params.id);
      const socket = hold?.snapshotSocket();
      return response.ok({
        body: {
          parked: hold?.parked ?? false,
          continuedAfterHold: hold?.continuedAfterHold ?? false,
          authCompleted: hold?.authCompleted ?? false,
          authorized: socket?.authorized ?? null,
          peerCertificateNull: socket?.peerCertificateNull ?? false,
        },
      });
    }
  );

  router.post(
    {
      path: `${PREAUTH_HOLD_PATH_PREFIX}/{id}/release`,
      security: unauthenticatedTestRouteSecurity,
      validate: holdIdParams,
      options: { xsrfRequired: false },
    },
    (_context, request, response) => {
      const hold = preauthHolds.get(request.params.id);
      if (!hold) {
        return response.notFound();
      }
      hold.release();
      return response.ok();
    }
  );

  for (const isAuthFlow of [true, false]) {
    router.get(
      {
        path: `/authentication/app/${isAuthFlow ? 'auth_flow' : 'not_auth_flow'}`,
        validate: {
          query: schema.object({
            statusCode: schema.maybe(schema.number()),
            message: schema.maybe(schema.string()),
          }),
        },
        options: { tags: isAuthFlow ? [ROUTE_TAG_AUTH_FLOW] : [], authRequired: !isAuthFlow },
      },
      (context, request, response) => {
        if (request.query.statusCode) {
          return response.customError({
            statusCode: request.query.statusCode,
            body: request.query.message ?? `${request.query.statusCode} response`,
          });
        }

        return response.ok({ body: isAuthFlow ? 'Auth flow complete' : 'Not auth flow complete' });
      }
    );
  }

  router.post(
    {
      path: '/authentication/app/setup',
      validate: { body: schema.object({ simulateUnauthorized: schema.boolean() }) },
      options: { authRequired: false, xsrfRequired: false },
    },
    (context, request, response) => {
      authenticationAppOptions.simulateUnauthorized = request.body.simulateUnauthorized;
      return response.ok();
    }
  );

  router.post(
    {
      path: '/authentication/slow/me',
      validate: {
        body: schema.object({
          duration: schema.duration(),
          client: schema.oneOf([
            schema.literal('request-context'),
            schema.literal('start-contract'),
            schema.literal('custom'),
          ]),
        }),
      },
      options: { xsrfRequired: false },
    },
    async (context, request, response) => {
      const slowLog = logger.get('slow/me');
      slowLog.info(`Received request ${JSON.stringify(request.body)}.`);

      let scopedClient;
      if (request.body.client === 'start-contract') {
        scopedClient = (await core.getStartServices())[0].elasticsearch.client.asScoped(request);
      } else if (request.body.client === 'request-context') {
        scopedClient = (await context.core).elasticsearch.client;
      } else {
        scopedClient = (await core.getStartServices())[0].elasticsearch
          .createClient('custom')
          .asScoped(request);
      }

      await scopedClient.asCurrentUser.security.authenticate();
      slowLog.info(
        `Performed initial authentication request, waiting (${request.body.duration.asSeconds()}s)...`
      );

      // 2. Wait specified amount of time.
      await new Promise((resolve) => setTimeout(resolve, request.body.duration.asMilliseconds()));
      slowLog.info(`Waiting is done, performing final authentication request.`);

      // 3. Make authentication request once again and return result.
      try {
        const body = await scopedClient.asCurrentUser.security.authenticate();
        slowLog.info(
          `Successfully performed final authentication request: ${JSON.stringify(body)}`
        );
        return response.ok({ body });
      } catch (err) {
        slowLog.error(
          `Failed to perform final authentication request: ${
            err instanceof errors.ResponseError ? JSON.stringify(err.body) : err.message
          }`
        );

        throw err;
      }
    }
  );

  router.post(
    {
      path: '/api_keys/_grant',
      validate: { body: restApiKeySchema },
    },
    async (context, request, response) => {
      const [, { security }] = await core.getStartServices();
      const apiKey = await security.authc.apiKeys.grantAsInternalUser(request, request.body);
      if (!apiKey) {
        throw new Error(
          `Couldn't generate API key with the following parameters: ${JSON.stringify(request.body)}`
        );
      }

      return response.ok({ body: apiKey });
    }
  );

  async function waitUntilTaskIsIdle(taskManager: TaskManagerStartContract) {
    logger.info(`Waiting until session cleanup task is in idle.`);

    const RETRY_SCALE_DURATION = 1000;
    let retriesElapsed = 0;
    let taskInstance: ConcreteTaskInstance;
    while (retriesElapsed < 15 /** max around ~100s **/) {
      await new Promise((resolve) => setTimeout(resolve, retriesElapsed * RETRY_SCALE_DURATION));

      try {
        taskInstance = await taskManager.get(SESSION_INDEX_CLEANUP_TASK_NAME);
        if (taskInstance.status === 'idle') {
          logger.info(`Session cleanup task is in idle state: ${JSON.stringify(taskInstance)}.`);
          return;
        }
      } catch (err) {
        logger.error(`Failed to fetch task: ${err?.message || err}.`);
        throw err;
      }

      if (++retriesElapsed < 15) {
        logger.warn(
          `Session cleanup task is NOT in idle state (waiting for ${
            retriesElapsed * RETRY_SCALE_DURATION
          }ms before retrying): ${JSON.stringify(taskInstance)}.`
        );
      } else {
        logger.error(
          `Failed to wait until session cleanup tasks enters an idle state: ${JSON.stringify(
            taskInstance
          )}.`
        );
      }
    }
  }

  async function refreshTaskManagerIndex(
    enabled: boolean,
    coreStart: CoreStart,
    taskManager: TaskManagerStartContract
  ) {
    // Refresh task manager index before trying to modify a task document.
    // Might not be needed once https://github.com/elastic/kibana/pull/148985 is merged.
    try {
      logger.info(
        `Refreshing task manager index (enabled: ${enabled}), current task: ${JSON.stringify(
          await taskManager.get(SESSION_INDEX_CLEANUP_TASK_NAME)
        )}...`
      );

      const refreshResult = await coreStart.elasticsearch.client.asInternalUser.indices.refresh({
        index: '.kibana_task_manager',
        expand_wildcards: 'all',
      });

      logger.info(
        `Successfully refreshed task manager index (enabled: ${enabled}), refresh result: ${JSON.stringify(
          refreshResult
        )}, current task: ${JSON.stringify(
          await taskManager.get(SESSION_INDEX_CLEANUP_TASK_NAME)
        )}.`
      );
    } catch (err) {
      logger.error(
        `Failed to refresh task manager index (enabled: ${enabled}): ${err?.message || err}.`
      );
    }
  }

  router.post(
    {
      path: '/session/_run_cleanup',
      validate: false,
    },
    async (context, request, response) => {
      const [, { taskManager }] = await core.getStartServices();
      await taskManager.runSoon(SESSION_INDEX_CLEANUP_TASK_NAME);
      return response.ok();
    }
  );

  router.post(
    {
      path: '/session/toggle_cleanup_task',
      validate: { body: schema.object({ enabled: schema.boolean() }) },
    },
    async (context, request, response) => {
      const [coreStart, { taskManager }] = await core.getStartServices();
      logger.info(`Toggle session cleanup task (enabled: ${request.body.enabled}).`);

      await refreshTaskManagerIndex(request.body.enabled, coreStart, taskManager);

      let bulkEnableDisableResult: BulkUpdateTaskResult;
      try {
        if (request.body.enabled) {
          logger.info(
            `Going to enable the following task: ${JSON.stringify(
              await taskManager.get(SESSION_INDEX_CLEANUP_TASK_NAME)
            )}.`
          );
          bulkEnableDisableResult = await taskManager.bulkEnable(
            [SESSION_INDEX_CLEANUP_TASK_NAME],
            true /** runSoon **/
          );
        } else {
          bulkEnableDisableResult = await taskManager.bulkDisable([
            SESSION_INDEX_CLEANUP_TASK_NAME,
          ]);
        }

        await refreshTaskManagerIndex(request.body.enabled, coreStart, taskManager);

        // Make sure that the task enters idle state before acknowledging that task was disabled.
        if (!request.body.enabled) {
          await waitUntilTaskIsIdle(taskManager);
        }
      } catch (err) {
        logger.error(
          `Failed to toggle session cleanup task (enabled: ${request.body.enabled}): ${
            err?.message || err
          }.`
        );
        throw err;
      }

      logger.info(
        `Successfully toggled session cleanup task (enabled: ${
          request.body.enabled
        }, enable/disable response: ${JSON.stringify(bulkEnableDisableResult)}).`
      );

      return response.ok();
    }
  );
}
