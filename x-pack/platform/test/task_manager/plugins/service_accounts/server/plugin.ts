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

// Tasks are disabled so they're never claimed.
const getTestTask = (id: string) => ({
  id,
  taskType: TASK_TYPE,
  params: {},
  state: {},
  enabled: false,
  schedule: { interval: '1h' },
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
        createTaskRunner: () => ({ run: async () => {} }),
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
          body: schema.object({ runAs: schema.maybe(runAsSchema) }),
        },
      },
      async (_context, request, response) => {
        const [, { taskManager: taskManagerStart }] = await core.getStartServices();
        const { runAs } = request.body;
        const task = getTestTask(request.params.id);
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
