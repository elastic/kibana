/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { generateAPIKeyName } from '@kbn/alerting-plugin/server/rules_client/common';
import { TASK_MANAGER_INDEX } from '@kbn/task-manager-plugin/server/constants';
import { INVALIDATE_API_KEY_SO_NAME } from '@kbn/task-manager-plugin/server/saved_objects';
import type { IValidatedEvent } from '@kbn/event-log-plugin/server';
import { getEventLog, ObjectRemover } from '../../../../common/lib';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

/**
 * Kept in sync with `defineTaskTypes` in the alerts fixture plugin, which writes the outcome of
 * each run here because a drained one-shot task is removed along with its state.
 */
const TASK_RESULT_INDEX = 'alerting-fixture-task-rule-creation';

const RULE_TYPE_ID = 'test.noop';

interface TaskOutcome {
  ruleName: string;
  taskApiKeyId?: string | null;
  ruleId?: string;
  error?: string;
}

interface ApiKeyDescriptor {
  id: string;
  name: string;
  invalidated: boolean;
}

export default function taskCreatedRuleApiKeyTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const supertest = getService('supertest');

  describe('rules created by a task', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    async function scheduleRuleCreatingTask(ruleName: string, cloneApiKey: boolean) {
      const { body } = await supertest
        .post(`/api/alerts_fixture/${ruleName}/_schedule_rule_creating_task`)
        .set('kbn-xsrf', 'foo')
        .send({ cloneApiKey })
        .expect(200);

      return body.id as string;
    }

    /** Waits for the task to run and report which key it authenticated with and what it created. */
    async function getTaskOutcome(ruleName: string): Promise<TaskOutcome> {
      return await retry.try(async () => {
        const result = await es.get<TaskOutcome>({ index: TASK_RESULT_INDEX, id: ruleName });
        const outcome = result._source;
        if (!outcome) {
          throw new Error(`The task has not reported an outcome for "${ruleName}" yet`);
        }
        return outcome;
      });
    }

    async function getApiKeyByName(name: string): Promise<ApiKeyDescriptor | undefined> {
      const { body } = await supertest
        .post('/internal/security/api_key/_query')
        .set('kbn-xsrf', 'foo')
        .send({ query: { match: { name } } })
        .expect(200);

      return body.apiKeys.find((key: ApiKeyDescriptor) => key.name === name);
    }

    /**
     * Task Manager queues the keys it granted in its own saved object type, which is separate from
     * the one alerting uses for the keys it owns.
     */
    async function getApiKeyIdsPendingInvalidation(): Promise<string[]> {
      const result = await es.search<{ [INVALIDATE_API_KEY_SO_NAME]: { apiKeyId: string } }>({
        index: TASK_MANAGER_INDEX,
        size: 1000,
        query: { term: { type: INVALIDATE_API_KEY_SO_NAME } },
      });

      return result.hits.hits
        .map((hit) => hit._source?.[INVALIDATE_API_KEY_SO_NAME]?.apiKeyId)
        .filter((apiKeyId): apiKeyId is string => apiKeyId !== undefined);
    }

    it('should not invalidate the rule API key when the task that created it is removed', async () => {
      const ruleName = 'task_created_rule_with_clone_api_key';
      await scheduleRuleCreatingTask(ruleName, true);

      const { taskApiKeyId, ruleId, error } = await getTaskOutcome(ruleName);
      expect(error).to.eql(undefined);
      expect(taskApiKeyId).to.be.a('string');
      expect(ruleId).to.be.a('string');
      objectRemover.add('default', ruleId!, 'rule', 'alerting');

      // The rule holds a key of its own rather than the one Task Manager granted to the task
      const { body: rule } = await supertest.get(`/api/alerting/rule/${ruleId}`).expect(200);
      expect(rule.api_key_created_by_user).to.eql(false);

      const ruleApiKeyName = generateAPIKeyName(RULE_TYPE_ID, ruleName);
      const ruleApiKey = await getApiKeyByName(ruleApiKeyName);
      expect(ruleApiKey).not.to.be(undefined);
      const ruleApiKeyId = ruleApiKey?.id;
      expect(ruleApiKeyId).not.to.eql(taskApiKeyId);

      // Removing the drained task queues its own key, and only its own key, for invalidation
      const pendingApiKeyIds = await retry.try(async () => {
        const apiKeyIds = await getApiKeyIdsPendingInvalidation();
        expect(apiKeyIds).to.contain(taskApiKeyId);
        return apiKeyIds;
      });
      expect(pendingApiKeyIds).not.to.contain(ruleApiKeyId);

      // Draining the queue is the moment a rule holding the task's key would stop working
      await supertest
        .post('/api/alerts_fixture/task_manager_api_key_invalidation/_run_soon')
        .set('kbn-xsrf', 'foo')
        .expect(200);

      await retry.try(async () => {
        const apiKeyIds = await getApiKeyIdsPendingInvalidation();
        expect(apiKeyIds).not.to.contain(taskApiKeyId);
      });

      expect((await getApiKeyByName(ruleApiKeyName))?.invalidated).to.eql(false);

      // The rule keeps executing after the task's key is gone
      const invalidatedAt = Date.now();
      await retry.try(async () => {
        const events = await getEventLog({
          getService,
          spaceId: 'default',
          type: 'alert',
          id: ruleId!,
          provider: 'alerting',
          actions: new Map([['execute', { gte: 1 }]]),
        });

        const executeEventAfterInvalidation = events.find(
          (event: IValidatedEvent) =>
            event?.event?.action === 'execute' &&
            new Date(event?.['@timestamp'] ?? 0).valueOf() > invalidatedAt
        );

        expect(executeEventAfterInvalidation).not.to.be(undefined);
        expect(executeEventAfterInvalidation?.event?.outcome).to.eql('success');
      });
    });

    it('should persist the task API key on the rule when the task does not clone it', async () => {
      // Without the flag the rule adopts the caller's key, which for a task is the credential
      // Task Manager invalidates on removal. Kept as a guard that the flag is what makes the
      // difference, rather than something else about how the task creates the rule.
      const ruleName = 'task_created_rule_without_clone_api_key';
      await scheduleRuleCreatingTask(ruleName, false);

      const { taskApiKeyId, ruleId, error } = await getTaskOutcome(ruleName);
      expect(error).to.eql(undefined);
      objectRemover.add('default', ruleId!, 'rule', 'alerting');

      const { body: rule } = await supertest.get(`/api/alerting/rule/${ruleId}`).expect(200);
      expect(rule.api_key_created_by_user).to.eql(true);

      // No key of the rule's own was minted, and the task's key is on its way out
      expect(await getApiKeyByName(generateAPIKeyName(RULE_TYPE_ID, ruleName))).to.be(undefined);
      await retry.try(async () => {
        expect(await getApiKeyIdsPendingInvalidation()).to.contain(taskApiKeyId);
      });
    });
  });
}
