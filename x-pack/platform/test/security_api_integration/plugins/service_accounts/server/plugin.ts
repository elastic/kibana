/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';
import { setTimeout } from 'timers/promises';

import { schema } from '@kbn/config-schema';
import type { CoreSetup, Plugin } from '@kbn/core/server';
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
        validate: false,
      },
      async (_context, request, response) => {
        const [, { taskManager: taskManagerStart }] = await core.getStartServices();
        try {
          const task = await taskManagerStart.schedule(
            {
              taskType: NOOP_TASK_TYPE,
              runAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              params: {},
              state: {},
            },
            { request }
          );
          return response.ok({ body: { id: task.id, apiKeyId: task.userScope?.apiKeyId } });
        } catch (error) {
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
                schema.literal('create_rule'),
              ],
              { defaultValue: 'authenticate' }
            ),
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
        const { operation, serviceAccountId, waitMs, action, revoke, rule } = request.body;
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
              // A nested caller: the workload calls a Kibana API as the account through the self
              // client, and that API mints the workload's own credential.
              if (action === 'create_rule') {
                try {
                  const { response: ruleResponse, body } = await start.http.selfClient
                    .asScoped(fakeRequest)
                    .fetch('/api/alerting/rule', { method: 'POST', body: rule, asResponse: true });
                  return { status: ruleResponse.status, body };
                } catch (error) {
                  if (error instanceof Error && 'response' in error && 'body' in error) {
                    const { response: ruleResponse, body } = error as Error & {
                      response?: Response;
                      body?: unknown;
                    };
                    if (ruleResponse) return { status: ruleResponse.status, body };
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
