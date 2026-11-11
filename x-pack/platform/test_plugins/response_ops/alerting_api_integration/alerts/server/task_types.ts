/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { CoreSetup } from '@kbn/core/server';
import type { AlertingServerStart } from '@kbn/alerting-plugin/server/plugin';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult, TaskCost } from '@kbn/task-manager-plugin/server/task';
import type { FixtureStartDeps } from './plugin';

export const RULE_CREATING_TASK_TYPE = 'testing:createRuleWithTaskApiKey';

/**
 * A successful one-shot task is removed once it drains, taking its state with it, so the task
 * records its outcome here instead. Tests need the task gone to observe API key invalidation.
 */
export const RULE_CREATING_TASK_RESULT_INDEX = 'alerting-fixture-task-rule-creation';

const paramsSchema = schema.object({
  ruleName: schema.string(),
  cloneApiKey: schema.boolean(),
});

interface TaskOutcome {
  ruleName: string;
  taskApiKeyId?: string | null;
  ruleId?: string;
  error?: string;
}

/**
 * Registers a task type that creates an alerting rule while running under the API key Task Manager
 * granted for the task, the way Agent Builder creates rules from a conversation task.
 */
export function defineTaskTypes(
  core: CoreSetup<FixtureStartDeps>,
  taskManager: TaskManagerSetupContract,
  alertingStart: Promise<AlertingServerStart>
) {
  taskManager.registerTaskDefinitions({
    [RULE_CREATING_TASK_TYPE]: {
      title: 'Create a rule using the task API key',
      description:
        'Creates an alerting rule from a task runner, scoped to the credential Task Manager persisted for the task. Used to verify which API key a rule created this way ends up owning.',
      timeout: '1m',
      maxAttempts: 1,
      cost: TaskCost.Tiny,
      paramsSchema,
      createTaskRunner: ({ taskInstance, fakeRequest, signal }: RunContext) => ({
        async run() {
          const [{ elasticsearch }] = await core.getStartServices();
          const { ruleName, cloneApiKey } = taskInstance.params as TypeOf<typeof paramsSchema>;
          const outcome: TaskOutcome = { ruleName };

          if (!fakeRequest) {
            throw new Error('Task Manager provided no fake request, so the task has no API key');
          }

          // The outcome index is outside everything `kibana_system` may write to, so the task
          // reports through its own credential, which inherits the scheduling user's privileges.
          const scopedEsClient = elasticsearch.client.asScoped(fakeRequest).asCurrentUser;

          try {
            // `_authenticate` names the credential Elasticsearch accepted, which is how the test
            // learns the id of the key Task Manager granted for this task.
            const authentication = await scopedEsClient.security.authenticate({}, { signal });
            outcome.taskApiKeyId = authentication.api_key?.id ?? null;

            const alerting = await alertingStart;
            const rulesClient = await alerting.getRulesClientWithRequest(fakeRequest);
            const rule = await rulesClient.create({
              data: {
                enabled: true,
                name: ruleName,
                schedule: { interval: '1s' },
                tags: [],
                consumer: 'alertsFixture',
                params: {},
                actions: [],
                alertTypeId: 'test.noop',
              },
              options: { cloneApiKey },
            });
            outcome.ruleId = rule.id;
          } catch (e) {
            outcome.error = e.message;
          }

          // Failures are recorded rather than rethrown so that the task still drains and is
          // removed, and so the test reports what went wrong instead of only timing out.
          await scopedEsClient.index(
            {
              index: RULE_CREATING_TASK_RESULT_INDEX,
              id: ruleName,
              document: outcome,
              refresh: true,
            },
            { signal }
          );

          // Removing the task is what queues its API key for invalidation, which is the whole
          // point of the scenario: a rule outliving the task that created it.
          return getDeleteTaskRunResult();
        },
      }),
    },
  });
}
