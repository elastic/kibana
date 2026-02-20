/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type DiagnosticResult, errors } from '@elastic/elasticsearch';

import { schema } from '@kbn/config-schema';
import type { CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/server';
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
      security: { authz: { enabled: false, reason: '' } },
    },
    async (context, request, response) => {
      if (authenticationAppOptions.simulateUnauthorized) {
        return response.unauthorized();
      }
      return response.renderCoreApp();
    }
  );

  const router = core.http.createRouter();

  for (const isAuthFlow of [true, false]) {
    router.get(
      {
        path: `/authentication/app/${isAuthFlow ? 'auth_flow' : 'not_auth_flow'}`,
        security: {
          authz: {
            enabled: false,
            reason: 'This route is opted out from authorization',
          },
        },
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
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
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
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
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
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
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
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
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
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
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

  router.post(
    {
      path: '/simulate_point_in_time_failure',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: { body: schema.object({ simulateOpenPointInTimeFailure: schema.boolean() }) },
      options: { authRequired: false, xsrfRequired: false },
    },
    async (context, request, response) => {
      const esClient = (await context.core).elasticsearch.client.asInternalUser;
      const originalOpenPointInTime = esClient.openPointInTime;

      if (request.body.simulateOpenPointInTimeFailure) {
        // @ts-expect-error
        esClient.openPointInTime = async function (params, options) {
          const { index } = params;
          if (index.includes('kibana_security_session')) {
            return {
              statusCode: 503,
              meta: {},
              body: {
                error: {
                  type: 'no_shard_available_action_exception',
                  reason: 'no shard available for [open]',
                },
              },
            };
            return {
              statusCode: 503,
              message: 'no_shard_available_action_exception',
            } as unknown as DiagnosticResult;
          }
          return originalOpenPointInTime.call(this, params, options);
        };
      } else {
        esClient.openPointInTime = originalOpenPointInTime;
      }

      return response.ok();
    }
  );

  router.get(
    {
      path: '/cleanup_task_status',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: false,
      options: { authRequired: false },
    },
    async (context, request, response) => {
      const [, { taskManager }] = await core.getStartServices();
      const res = await taskManager.get(SESSION_INDEX_CLEANUP_TASK_NAME);
      const { attempts, state, status } = res;
      return response.ok({ body: { attempts, state, status } });
    }
  );

  router.post(
    {
      path: '/test_endpoints/api_keys/_grant',
      validate: false,
      security: { authz: { enabled: false, reason: 'Mock IDP plugin for testing' } },
    },
    async (_, request, response) => {
      const [{ security }] = await core.getStartServices();

      const result = await security.authc.apiKeys.grantAsInternalUser(request, {
        name: 'mock-idp-api-key',
        kibana_role_descriptors: {},
      });

      return result
        ? response.ok({ body: result })
        : response.badRequest({ body: { message: 'Failed to grant API key' } });
    }
  );

  router.post(
    {
      path: '/test_endpoints/api_keys/_invalidate',
      validate: {
        body: schema.object({ ids: schema.arrayOf(schema.string(), { minSize: 1 }) }),
      },
      security: { authz: { enabled: false, reason: 'Mock IDP plugin for testing' } },
    },
    async (_, request, response) => {
      const [{ security }] = await core.getStartServices();

      const result = await security.authc.apiKeys.invalidateAsInternalUser({
        ids: request.body.ids,
      });

      return result
        ? response.ok({ body: result })
        : response.badRequest({ body: { message: 'Failed to invalidate API key(s)' } });
    }
  );

  router.post(
    {
      path: '/test_endpoints/uiam/secondary_auth',
      validate: {
        body: schema.object({ apiKey: schema.maybe(schema.string()) }),
      },
      security: {
        authc: { enabled: 'optional' },
        authz: { enabled: false, reason: 'Mock IDP plugin for testing' },
      },
    },
    async (_, request, response) => {
      const [{ elasticsearch }] = await core.getStartServices();

      const scopedClient = elasticsearch.client.asScoped(
        request.body.apiKey
          ? { headers: { authorization: `ApiKey ${request.body.apiKey}` } }
          : request
      );

      return response.ok({
        body: (await scopedClient.asSecondaryAuthUser.transport.request({
          method: 'GET',
          path: `/_metering/stats`,
        })) as Record<string, unknown>,
      });
    }
  );

  router.post(
    {
      path: '/test_endpoints/uiam/scoped_client/_call',
      validate: {
        body: schema.object({ apiKey: schema.maybe(schema.string()) }),
      },
      security: {
        authc: { enabled: 'optional' },
        authz: { enabled: false, reason: 'Mock IDP plugin for testing' },
      },
    },
    async (context, request, response) => {
      try {
        const [{ elasticsearch }] = await core.getStartServices();

        const scopedClient = elasticsearch.client.asScoped(
          request.body.apiKey
            ? { headers: { authorization: `ApiKey ${request.body.apiKey}` } }
            : request
        );

        return response.ok({ body: await scopedClient.asCurrentUser.security.authenticate() });
      } catch (err) {
        logger.error(`Failed to authenticate to ES with UIAM API Key: ${err}`, err);
        return response.customError({
          statusCode: 500,
          body: { message: err.message },
        });
      }
    }
  );
}
