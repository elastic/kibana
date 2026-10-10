/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, Plugin } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

const TASK_TYPE = 'taskManagerServiceAccountsTest:runAs';
const WORKLOAD_TYPE = 'task_manager_test';
const TASK_MANAGER_INDEX = '.kibana_task_manager';
const TASK_PATH = '/internal/task_manager_service_accounts_test/tasks/{id}';
const BULK_SCHEDULE_PATH = '/internal/task_manager_service_accounts_test/bulk_schedule';
const WORKLOAD_PATH = '/internal/task_manager_service_accounts_test/workloads/{workloadId}';

const authz = {
  enabled: false,
  reason: 'Test endpoints for Task Manager service account credentials',
} as const;

const taskIdSchema = schema.string({ minLength: 1, maxLength: 200 });
const taskParamsSchema = schema.object({ id: taskIdSchema });
const runAsSchema = schema.object({
  workloadType: schema.string({ maxLength: 1024 }),
  workloadId: schema.string({ maxLength: 1024 }),
  spaceId: schema.string({ maxLength: 1024 }),
  expectedServiceAccountId: schema.oneOf([
    schema.string({ maxLength: 1024 }),
    schema.literal(null),
  ]),
});

// Tasks are disabled unless asked otherwise, so they're never claimed.
const getTestTask = (id: string, enabled = false, runAt?: Date) => ({
  id,
  taskType: TASK_TYPE,
  params: {},
  state: {},
  enabled,
  schedule: { interval: '1h' },
  ...(runAt ? { runAt } : {}),
});

interface SetupDependencies {
  taskManager: TaskManagerSetupContract;
}

interface StartDependencies {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  taskManager: TaskManagerStartContract;
}

interface DecryptedTaskAttributes {
  credential?: Record<string, unknown>;
  encryptedCredential?: string;
  apiKey?: string;
}

export class TaskManagerServiceAccountsTestPlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  setup(core: CoreSetup<StartDependencies>, { taskManager }: SetupDependencies): void {
    core.security.serviceAccounts.registerWorkloadType({
      type: WORKLOAD_TYPE,
      name: 'Task Manager test',
    });
    taskManager.registerTaskDefinitions({
      [TASK_TYPE]: {
        title: 'Task Manager service accounts test task',
        runAs: {
          workloadTypes: [WORKLOAD_TYPE],
          withScopedRequest: async (params, fn) => {
            const [coreStart] = await core.getStartServices();
            return coreStart.security.serviceAccounts.withScopedRequestForWorkload(params, fn);
          },
        },
        // Records who the run was authenticated as.
        createTaskRunner: ({ runAs }) => ({
          run: async () => {
            if (!runAs) {
              throw new Error('The task has no service account to run as');
            }
            return runAs.withScopedRequest(async (request) => {
              const [coreStart] = await core.getStartServices();
              const { username, authentication_realm: realm } = await coreStart.elasticsearch.client
                .asScoped(request)
                .asCurrentUser.security.authenticate();
              return {
                state: {
                  username,
                  realm: realm.name,
                  principal: coreStart.security.authc.getPrincipal(request),
                },
              };
            });
          },
        }),
      },
    });

    const router = core.http.createRouter();

    router.post(
      {
        path: TASK_PATH,
        options: { access: 'internal' },
        security: { authz },
        validate: {
          params: taskParamsSchema,
          body: schema.object({
            runAs: schema.maybe(runAsSchema),
            enabled: schema.boolean({ defaultValue: false }),
            // ISO date; lets an enabled task be changed before its first run.
            runAt: schema.maybe(schema.string({ maxLength: 64 })),
          }),
        },
      },
      async (_context, request, response) => {
        const [, { taskManager: taskManagerStart }] = await core.getStartServices();
        const { runAs, enabled, runAt } = request.body;
        const task = getTestTask(request.params.id, enabled, runAt ? new Date(runAt) : undefined);
        const { id } = runAs
          ? await taskManagerStart.schedule({ ...task, runAs })
          : await taskManagerStart.schedule(task, { request });
        return response.ok({ body: { id } });
      }
    );

    // The request is always passed, so the tasks without runAs get API keys.
    router.post(
      {
        path: BULK_SCHEDULE_PATH,
        options: { access: 'internal' },
        security: { authz },
        validate: {
          body: schema.object({
            tasks: schema.arrayOf(
              schema.object({ id: taskIdSchema, runAs: schema.maybe(runAsSchema) }),
              { minSize: 1, maxSize: 10 }
            ),
          }),
        },
      },
      async (_context, request, response) => {
        const [, { taskManager: taskManagerStart }] = await core.getStartServices();
        const tasks = request.body.tasks.map(({ id, runAs }) => ({ ...getTestTask(id), runAs }));
        try {
          const scheduled = await taskManagerStart.bulkSchedule(tasks, { request });
          return response.ok({ body: { ids: scheduled.map(({ id }) => id) } });
        } catch (error) {
          // bulkSchedule throws the saved object error of the first task that failed.
          if (error.statusCode === 409) {
            return response.conflict({ body: { message: error.message } });
          }
          throw error;
        }
      }
    );

    router.post(
      {
        path: `${TASK_PATH}/_update`,
        options: { access: 'internal' },
        security: { authz },
        validate: {
          params: taskParamsSchema,
          body: schema.object({
            api: schema.oneOf([
              schema.literal('bulkUpdateState'),
              schema.literal('bulkUpdateSchedules'),
            ]),
          }),
        },
      },
      async (_context, request, response) => {
        const [, { taskManager: taskManagerStart }] = await core.getStartServices();
        const { id } = request.params;
        const { tasks, errors } =
          request.body.api === 'bulkUpdateState'
            ? await taskManagerStart.bulkUpdateState(
                [id],
                (state) => ({ ...state, updated: true }),
                { request }
              )
            : await taskManagerStart.bulkUpdateSchedules([id], { interval: '2h' }, { request });
        return response.ok({ body: { ids: tasks.map((task) => task.id), errors } });
      }
    );

    router.get(
      {
        path: `${TASK_PATH}/_decrypt`,
        options: { access: 'internal' },
        security: { authz },
        validate: { params: taskParamsSchema },
      },
      async (_context, request, response) => {
        const [, { encryptedSavedObjects }] = await core.getStartServices();
        try {
          const { attributes } = await encryptedSavedObjects
            .getClient({ includedHiddenTypes: ['task'] })
            .getDecryptedAsInternalUser<DecryptedTaskAttributes>('task', request.params.id);
          return response.ok({
            body: {
              credential: attributes.credential,
              encryptedCredential: attributes.encryptedCredential,
              hasApiKey: typeof attributes.apiKey === 'string',
            },
          });
        } catch (error) {
          if (encryptedSavedObjects.isEncryptionError(error)) {
            return response.badRequest({ body: { message: error.message } });
          }
          throw error;
        }
      }
    );

    // Binding and unbinding check the caller's `manage_security` privilege themselves.
    router.post(
      {
        path: WORKLOAD_PATH,
        options: { access: 'internal' },
        security: { authz },
        validate: {
          params: schema.object({ workloadId: taskIdSchema }),
          body: schema.oneOf([
            schema.object({
              operation: schema.literal('bind'),
              serviceAccountId: schema.string({ minLength: 1, maxLength: 1024 }),
            }),
            schema.object({ operation: schema.literal('unbind') }),
          ]),
        },
      },
      async (_context, request, response) => {
        const [coreStart] = await core.getStartServices();
        const { serviceAccounts } = coreStart.security;
        const workload = { workloadType: WORKLOAD_TYPE, workloadId: request.params.workloadId };
        const { body } = request;
        if (body.operation === 'bind') {
          const binding = await serviceAccounts.bindWorkload(request, {
            ...workload,
            serviceAccountId: body.serviceAccountId,
          });
          return response.ok({ body: binding });
        }
        return response.ok({
          body: { deleted: await serviceAccounts.unbindWorkload(request, workload) },
        });
      }
    );

    // Elasticsearch's superuser can't write the Task Manager system index; Kibana's internal user can.
    router.post(
      {
        path: `${TASK_PATH}/_change_credential`,
        options: { access: 'internal' },
        security: { authz },
        validate: {
          params: taskParamsSchema,
          body: schema.object({ workloadId: schema.string({ minLength: 1, maxLength: 1024 }) }),
        },
      },
      async (_context, request, response) => {
        const [coreStart] = await core.getStartServices();
        await coreStart.elasticsearch.client.asInternalUser.update({
          index: TASK_MANAGER_INDEX,
          id: `task:${request.params.id}`,
          doc: { task: { credential: { workloadId: request.body.workloadId } } },
          refresh: 'wait_for',
        });
        return response.noContent();
      }
    );
  }

  start(): void {}
}
