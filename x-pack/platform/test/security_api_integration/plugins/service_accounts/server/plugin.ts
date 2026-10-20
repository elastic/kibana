/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';
import { setTimeout } from 'timers/promises';
import { Agent, fetch } from 'undici';

import { schema } from '@kbn/config-schema';
import type { CoreSetup, Plugin } from '@kbn/core/server';
import { MOCK_IDP_UIAM_SERVICE_URL, MOCK_IDP_UIAM_SHARED_SECRET } from '@kbn/mock-idp-utils';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

interface SetupDependencies {
  security: SecurityPluginSetup;
  taskManager: TaskManagerSetupContract;
}

interface StartDependencies {
  taskManager: TaskManagerStartContract;
}

const NOOP_TASK_TYPE = 'serviceAccountsTest:noop';

export class ServiceAccountsTestPlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  setup(core: CoreSetup<StartDependencies>, { security, taskManager }: SetupDependencies): void {
    // Resolves jobs by the prefix of their ID, so tests can pick what the management page gets
    // back: no details, a path Core must refuse, a title alone, or a title and a path.
    core.security.serviceAccounts.registerWorkloadType({
      type: 'job',
      name: 'Test job',
      resolveWorkloads: async (workloads) =>
        workloads.map(({ workloadId }) => {
          if (workloadId.startsWith('unresolved-')) {
            return undefined;
          }
          const title = `Test job ${workloadId}`;
          if (workloadId.startsWith('bad-path-')) {
            return { title, path: '/app/../api/status' };
          }
          if (workloadId.startsWith('title-only-')) {
            return { title };
          }
          return {
            title,
            path: `/app/service_accounts_test/jobs/${encodeURIComponent(workloadId)}`,
          };
        }),
    });
    const router = core.http.createRouter();
    router.post(
      {
        path: '/internal/service_accounts_test/_credential_recovery',
        options: { access: 'internal', timeout: { idleSocket: 150_000 } },
        security: {
          authz: {
            enabled: false,
            reason: 'Exercises request credential recovery with real scoped calls and grants',
          },
        },
        validate: {
          body: schema.object({
            scenario: schema.oneOf([
              schema.literal('grants'),
              schema.literal('concurrent_grants'),
              schema.literal('scoped'),
              schema.literal('mixed'),
              schema.literal('late'),
              schema.literal('twice'),
            ]),
            backend: schema.oneOf([schema.literal('es'), schema.literal('uiam')]),
            waitMs: schema.number({ min: 0, max: 70_000 }),
            secondWaitMs: schema.number({ min: 0, max: 70_000, defaultValue: 0 }),
            probeFirst: schema.boolean({ defaultValue: true }),
          }),
        },
      },
      async (_context, request, response) => {
        const [coreStart] = await core.getStartServices();
        const originalHeaders = request.headers;
        const originalAuthorization = request.headers.authorization;
        // Instantiate every transport before expiry, so later calls really send stale credentials.
        const clients = Array.from(
          { length: 3 },
          () => coreStart.elasticsearch.client.asScoped(request).asCurrentUser
        );
        // A bare snapshot client cannot renew. Its 401 proves that every scenario actually crosses
        // expiry, even if HTTP authentication renewed an already-expired short-lived login token.
        const snapshot = coreStart.elasticsearch.client.asScoped({
          headers: { ...request.headers },
        }).asCurrentUser;
        const expiryDeadline = Date.now() + 70_000;
        let snapshotExpired = false;
        let cleanupComplete = false;
        let failure: Error | undefined;
        const usernames: string[] = [];
        const keys: Array<{ id: string; backend: 'es' | 'uiam' }> = [];
        const uiamKeys = new Map<string, string>();
        const dispatcher = new Agent({ connect: { rejectUnauthorized: false } });
        const callUiam = async (path: string, credential: string, method: 'POST' | 'DELETE') => {
          const result = await fetch(`${MOCK_IDP_UIAM_SERVICE_URL}/uiam/api/v1/${path}`, {
            method,
            dispatcher,
            headers: {
              Authorization: `ApiKey ${credential}`,
              'x-client-authentication': MOCK_IDP_UIAM_SHARED_SECRET,
              'Content-Type': 'application/json',
            },
            ...(method === 'POST' ? { body: '{}' } : {}),
          });
          if (!result.ok) {
            await result.arrayBuffer();
            throw new Error(`UIAM ${method} ${path} failed: ${result.status}`);
          }
          return result;
        };
        const authenticate = async (client = clients[0]) => {
          const user = await client.security.authenticate();
          usernames.push(user.username);
        };
        const grant = async () => {
          const apiKeys = coreStart.security.authc.apiKeys;
          const key =
            request.body.backend === 'uiam'
              ? await apiKeys.uiam?.grant(request, { name: `credential-recovery-${request.uuid}` })
              : await apiKeys.grantAsInternalUser(
                  request,
                  { name: `credential-recovery-${request.uuid}`, role_descriptors: {} },
                  { refresh: false }
                );
          if (!key) throw new Error(`The ${request.body.backend} grant backend is unavailable`);
          keys.push({ id: key.id, backend: request.body.backend });
          if (request.body.backend === 'uiam') uiamKeys.set(key.id, key.api_key);
          const credential =
            request.body.backend === 'uiam'
              ? key.api_key
              : Buffer.from(`${key.id}:${key.api_key}`).toString('base64');
          // Verify the actual granted key's identity without exposing the key to the test client.
          const keyClient = coreStart.elasticsearch.client.asScoped({
            headers: { authorization: `ApiKey ${credential}` },
          }).asCurrentUser;
          if (request.body.backend === 'es') {
            await authenticate(keyClient);
          } else {
            const principal = await keyClient.security.authenticate();
            if (principal.username !== key.id)
              throw new Error('UIAM key authenticated as a different key principal');
            const authenticated = await callUiam(
              'authentication/_authenticate?with_limited_by=true',
              key.api_key,
              'POST'
            );
            const info = (await authenticated.json()) as {
              api_key_id: string;
              credentials?: { creator?: { type: string; user_id?: number } };
            };
            const creator = info.credentials?.creator;
            if (
              info.api_key_id !== key.id ||
              creator?.type !== 'user' ||
              !Number.isSafeInteger(creator.user_id)
            ) {
              throw new Error('UIAM did not identify the granting user as the key creator');
            }
            usernames.push(String(creator.user_id));
          }
        };
        const together = async (operations: Array<Promise<void>>) => {
          const outcomes = await Promise.allSettled(operations);
          const failed = outcomes.find((outcome) => outcome.status === 'rejected');
          if (failed?.status === 'rejected') throw failed.reason;
        };
        const result = () => ({
          keys,
          usernames,
          snapshotExpired,
          cleanupComplete,
          headersUnchanged:
            request.headers === originalHeaders &&
            request.headers.authorization === originalAuthorization,
        });
        try {
          await setTimeout(request.body.waitMs);
          while (request.body.probeFirst && !snapshotExpired) {
            try {
              await snapshot.security.authenticate();
            } catch (error) {
              if (
                error instanceof errors.ResponseError &&
                error.statusCode === 401 &&
                (error.body?.error?.reason === 'token expired' ||
                  error.body?.error?.caused_by?.authentication_error_code === '0x7E0116')
              ) {
                snapshotExpired = true;
                break;
              }
              throw error;
            }
            if (Date.now() >= expiryDeadline)
              throw new Error('The captured credential did not expire within the test window');
            await setTimeout(250);
          }
          switch (request.body.scenario) {
            case 'grants':
              await grant();
              await grant();
              break;
            case 'concurrent_grants':
              await together([grant(), grant(), grant()]);
              break;
            case 'scoped':
              await together(clients.map((client) => authenticate(client)));
              break;
            case 'mixed':
              await together([
                authenticate(clients[0]),
                authenticate(clients[1]),
                grant(),
                grant(),
              ]);
              break;
            case 'late':
              await authenticate(clients[0]);
              await authenticate(clients[1]);
              await grant();
              break;
            case 'twice': {
              await together([authenticate(clients[0]), grant()]);
              const renewedClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;
              await setTimeout(request.body.secondWaitMs);
              await together([authenticate(renewedClient), grant()]);
              await authenticate(clients[2]);
              break;
            }
          }
        } catch (error) {
          failure = error;
        }
        try {
          const esKeyIds = keys.filter((key) => key.backend === 'es').map((key) => key.id);
          if (esKeyIds.length) {
            const invalidated = await coreStart.security.authc.apiKeys.invalidateAsInternalUser({
              ids: esKeyIds,
            });
            if (!invalidated || invalidated.error_count)
              throw new Error('Native ES key cleanup failed');
          }
          for (const [id, credential] of uiamKeys) {
            const revoked = await callUiam(
              `api-keys/${encodeURIComponent(id)}`,
              credential,
              'DELETE'
            );
            await revoked.arrayBuffer();
          }
          cleanupComplete = true;
        } finally {
          await dispatcher.close();
        }
        return failure
          ? response.customError({
              statusCode: Boom.isBoom(failure) ? failure.output.statusCode : 500,
              bypassErrorFormat: true,
              body: { ...result(), message: failure.message },
            })
          : response.ok({ body: result() });
      }
    );
    taskManager.registerTaskDefinitions({
      [NOOP_TASK_TYPE]: {
        title: 'Service accounts test no-op',
        createTaskRunner: () => ({ run: async () => undefined }),
      },
    });
    // Schedules a task with the caller's request, so Task Manager grants an API key from the
    // caller's credential. The task is due far in the future and never runs.
    router.post(
      {
        path: '/internal/service_accounts_test/_tasks',
        options: { access: 'internal' },
        security: {
          authz: { enabled: false, reason: 'Test endpoint scheduling a no-op task as the caller' },
        },
        validate: {
          query: schema.object({
            waitMs: schema.number({ min: 0, max: 20_000, defaultValue: 0 }),
            count: schema.number({ min: 1, max: 3, defaultValue: 1 }),
            concurrent: schema.boolean({ defaultValue: false }),
            authenticateFirst: schema.boolean({ defaultValue: false }),
          }),
        },
      },
      async (context, request, response) => {
        const [, { taskManager: taskManagerStart }] = await core.getStartServices();
        const tasks: Array<{ id: string; apiKeyId: string | undefined }> = [];
        try {
          // Expire the session token after HTTP authentication, before the internal API-key grant.
          await setTimeout(request.query.waitMs);
          if (request.query.authenticateFirst) {
            const { elasticsearch } = await context.core;
            await elasticsearch.client.asCurrentUser.security.authenticate();
          }
          const schedule = async () => {
            const task = await taskManagerStart.schedule(
              {
                taskType: NOOP_TASK_TYPE,
                runAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                params: {},
                state: {},
              },
              { request }
            );
            tasks.push({ id: task.id, apiKeyId: task.userScope?.apiKeyId });
          };
          if (request.query.concurrent) {
            await Promise.all(Array.from({ length: request.query.count }, schedule));
          } else {
            for (let index = 0; index < request.query.count; index++) {
              await schedule();
            }
          }
          const [task, ...additionalTasks] = tasks;
          return response.ok({
            body: { ...task, ...(additionalTasks.length ? { additionalTasks } : {}) },
          });
        } catch (error) {
          await Promise.all(tasks.map((task) => taskManagerStart.removeIfExists(task.id)));
          return response.customError({
            statusCode: Boom.isBoom(error) ? error.output.statusCode : 500,
            body: { message: error.message },
          });
        }
      }
    );
    router.delete(
      {
        path: '/internal/service_accounts_test/_tasks/{taskId}',
        options: { access: 'internal' },
        security: {
          authz: { enabled: false, reason: 'Test endpoint removing a task it scheduled' },
        },
        validate: {
          params: schema.object({ taskId: schema.string({ minLength: 1, maxLength: 128 }) }),
        },
      },
      async (_context, request, response) => {
        const [, { taskManager: taskManagerStart }] = await core.getStartServices();
        await taskManagerStart.removeIfExists(request.params.taskId);
        return response.noContent();
      }
    );
    // Reports how Core classified the request's principal. Authorization is intentionally off:
    // the point is to observe classification for credentials without Kibana privileges.
    router.get(
      {
        path: '/internal/service_accounts_test/_principal',
        options: { access: 'internal' },
        security: {
          authz: { enabled: false, reason: 'Test endpoint reporting the authenticated principal' },
        },
        validate: false,
      },
      async (context, _request, response) => {
        const { security: coreSecurity } = await context.core;
        return response.ok({ body: { principal: coreSecurity.authc.getPrincipal() } });
      }
    );
    router.post(
      {
        path: '/internal/service_accounts_test/{workloadId}',
        options: { access: 'internal' },
        security: {
          authz: {
            enabled: false,
            reason:
              'The test consumer checks the caller’s manage_security cluster privilege before every operation.',
          },
        },
        validate: {
          params: schema.object({ workloadId: schema.string({ minLength: 1, maxLength: 128 }) }),
          body: schema.object({
            operation: schema.oneOf([
              schema.literal('bind'),
              schema.literal('unbind'),
              schema.literal('execute'),
            ]),
            serviceAccountId: schema.maybe(schema.string({ minLength: 1, maxLength: 1024 })),
            // Long enough to outlive the shortest token each backend issues, so a test can check
            // renewal. UIAM exchange tokens live at least one minute (PT1M, plus 2s of clock skew),
            // and the stateful config set expires Elasticsearch tokens after 15s.
            waitMs: schema.number({ min: 0, max: 70000, defaultValue: 0 }),
            action: schema.oneOf(
              [
                schema.literal('authenticate'),
                schema.literal('read_role'),
                schema.literal('get_saved_object'),
                schema.literal('create_rule'),
                schema.literal('schedule_task'),
              ],
              { defaultValue: 'authenticate' }
            ),
            // The dashboard `get_saved_object` reads as the service account.
            savedObjectId: schema.maybe(schema.string({ minLength: 1, maxLength: 128 })),
            rule: schema.maybe(schema.object({}, { unknowns: 'allow' })),
            revoke: schema.oneOf(
              [
                schema.literal('none'),
                schema.literal('unbind'),
                schema.literal('disable'),
                schema.literal('delete_token'),
              ],
              { defaultValue: 'none' }
            ),
          }),
        },
      },
      async (_context, request, response) => {
        const { hasAllRequested } = await security.authz
          .checkPrivilegesWithRequest(request)
          .globally({
            elasticsearch: { cluster: ['manage_security'], index: {} },
          });
        if (!hasAllRequested) return response.forbidden();
        const [start] = await core.getStartServices();
        const api = start.security.serviceAccounts;
        const workload = { workloadType: 'job', workloadId: request.params.workloadId };
        const { operation, serviceAccountId, waitMs, action, revoke, savedObjectId, rule } =
          request.body;
        try {
          if (operation === 'bind') {
            if (!serviceAccountId) return response.badRequest();
            return response.ok({
              body: await api.bindWorkload(request, { ...workload, serviceAccountId }),
            });
          }
          if (operation === 'unbind') {
            return response.ok({ body: { deleted: await api.unbindWorkload(request, workload) } });
          }
          const result = await api.withScopedRequestForWorkload(
            { ...workload, spaceId: request.spaceId ?? 'default' },
            async (fakeRequest) => {
              if (action === 'get_saved_object') {
                if (!savedObjectId) throw Boom.badRequest();
                try {
                  await start.savedObjects
                    .getScopedClient(fakeRequest)
                    .get('dashboard', savedObjectId);
                  return { savedObjectStatus: 200 };
                } catch (error) {
                  return {
                    savedObjectStatus: Boom.isBoom(error) ? error.output.statusCode : 500,
                  };
                }
              }
              // A nested caller: the workload calls a Kibana API as the account through the self
              // client, and that API mints the workload's own credential.
              if (action === 'create_rule' || action === 'schedule_task') {
                try {
                  const { response: nestedResponse, body } = await start.http.selfClient
                    .asScoped(fakeRequest)
                    .fetch(
                      action === 'create_rule'
                        ? '/api/alerting/rule'
                        : '/internal/service_accounts_test/_tasks',
                      {
                        method: 'POST',
                        body: action === 'create_rule' ? rule : undefined,
                        access: action === 'create_rule' ? 'public' : 'internal',
                        asResponse: true,
                      }
                    );
                  return { status: nestedResponse.status, body };
                } catch (error) {
                  if (error instanceof Error && 'response' in error && 'body' in error) {
                    const { response: nestedResponse, body } = error as Error & {
                      response?: Response;
                      body?: unknown;
                    };
                    if (nestedResponse) return { status: nestedResponse.status, body };
                  }
                  throw error;
                }
              }
              const client = start.elasticsearch.client.asScoped(fakeRequest).asCurrentUser;
              const initialAuthorization = fakeRequest.headers.authorization;
              const principal = start.security.authc.getPrincipal(fakeRequest);
              const initial = await client.security.authenticate();
              // Both calls are available in serverless mode, unlike cluster health or a lookup of
              // the `superuser` role. Listing roles needs `read_security`.
              await client.info();
              if (action === 'read_role') await client.security.getRole();
              if (revoke === 'unbind') await api.unbindWorkload(request, workload);
              if (revoke === 'disable' || revoke === 'delete_token') {
                const [namespace, name] = initial.username.split('/');
                const accountPath = `/_security/service/${encodeURIComponent(
                  namespace
                )}/${encodeURIComponent(name)}`;
                const admin = start.elasticsearch.client.asScoped(request).asCurrentUser;
                if (revoke === 'disable') {
                  await admin.transport.request({
                    method: 'PUT',
                    path: accountPath,
                    body: { roles: initial.roles, enabled: false },
                    querystring: { refresh: 'wait_for' },
                  });
                } else {
                  await admin.transport.request({
                    method: 'DELETE',
                    path: `${accountPath}/credential/token/kibana-managed`,
                    querystring: { refresh: 'wait_for' },
                  });
                }
              }
              // Revoking the source authority does not invalidate the already-issued token.
              const afterChange = await client.security.authenticate();
              await setTimeout(waitMs);
              try {
                const renewed = await client.security.authenticate();
                return {
                  username: initial.username,
                  afterChangeUsername: afterChange.username,
                  renewedUsername: renewed.username,
                  tokenChanged: initialAuthorization !== fakeRequest.headers.authorization,
                  spaceId: fakeRequest.spaceId,
                  principal,
                  renewedPrincipal: start.security.authc.getPrincipal(fakeRequest),
                };
              } catch (error) {
                if (!(error instanceof errors.ResponseError)) throw error;
                return {
                  username: initial.username,
                  afterChangeUsername: afterChange.username,
                  renewalStatus: error.statusCode,
                };
              }
            }
          );
          return response.ok({ body: result });
        } catch (error) {
          const statusCode = Boom.isBoom(error)
            ? error.output.statusCode
            : error instanceof errors.ResponseError
            ? error.statusCode ?? 500
            : 500;
          return response.customError({
            statusCode,
            body: { message: 'Service account test operation failed.' },
          });
        }
      }
    );
  }

  start(): void {}
}
