/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../../common/lib';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

const LOADED_RULE_ID = '74f3e6d7-b7bb-477d-ac28-92ee22728e6e';
const STUCK_RULE_ID = 'd7f3cca6-e2aa-4921-aee8-12d2ad3873ca';

// Task documents to seed directly into .kibana_task_manager.
// The `task` SO type is not importable/exportable via the standard SO API.
const SEEDED_TASKS = [
  {
    id: `task:329798f0-b0b0-11ea-9510-fdf248d5f2a4`,
    source: {
      type: 'task',
      references: [],
      updated_at: '2021-11-05T16:21:37.629Z',
      task: {
        attempts: 0,
        ownerId: null,
        params: `{"alertId":"${LOADED_RULE_ID}","spaceId":"default"}`,
        retryAt: null,
        runAt: '2021-11-05T16:21:52.148Z',
        schedule: { interval: '1m' },
        scheduledAt: '2021-11-05T15:28:42.055Z',
        scope: ['alerting'],
        startedAt: null,
        status: 'idle',
        taskType: 'alerting:example.always-firing',
      },
    },
  },
  {
    id: `task:${STUCK_RULE_ID}`,
    source: {
      type: 'task',
      references: [],
      updated_at: '2021-11-05T16:21:37.629Z',
      task: {
        attempts: 0,
        ownerId: null,
        params: `{"alertId":"${STUCK_RULE_ID}","spaceId":"default"}`,
        retryAt: null,
        runAt: '2021-11-05T16:21:52.148Z',
        schedule: { interval: '1d' },
        scheduledAt: '2021-11-05T15:28:42.055Z',
        scope: ['alerting'],
        startedAt: null,
        status: 'running',
        taskType: 'alerting:example.always-firing',
      },
    },
  },
] as const;

export default function createRunSoonTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const es = getService('es');
  const kibanaServer = getService('kibanaServer');

  describe('runSoon', () => {
    const objectRemover = new ObjectRemover(supertest);

    before(async () => {
      // Load alert rules via SO import API.
      // Tasks are seeded directly into .kibana_task_manager because the `task`
      // SO type is not importable/exportable via the standard SO API.
      await kibanaServer.importExport.load(
        'x-pack/platform/test/functional/fixtures/kbn_archives/rules_scheduled_task_id/rules.json'
      );
      await es.bulk({
        operations: SEEDED_TASKS.flatMap(({ id, source }) => [
          { index: { _index: '.kibana_task_manager', _id: id } },
          source,
        ]),
        refresh: true,
      });
    });

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'x-pack/platform/test/functional/fixtures/kbn_archives/rules_scheduled_task_id/rules.json'
      );
      await es.bulk({
        operations: SEEDED_TASKS.map(({ id }) => ({
          delete: { _index: '.kibana_task_manager', _id: id },
        })),
        refresh: true,
      });
    });

    it('should successfully run rule where scheduled task id is different than rule id', async () => {
      await retry.try(async () => {
        // Sometimes the rule may already be running, which returns a 200. Try until it isn't
        const response = await supertest
          .post(`${getUrlPrefix(``)}/internal/alerting/rule/${LOADED_RULE_ID}/_run_soon`)
          .set('kbn-xsrf', 'foo');
        expect(response.status).to.eql(204);
      });
    });

    it('should successfully run rule where scheduled task id is same as rule id', async () => {
      const response = await supertest
        .post(`${getUrlPrefix(``)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData());

      expect(response.status).to.eql(200);
      objectRemover.add('default', response.body.id, 'rule', 'alerting');

      await retry.try(async () => {
        // Sometimes the rule may already be running, which returns a 200. Try until it isn't
        const runSoonResponse = await supertest
          .post(`${getUrlPrefix(``)}/internal/alerting/rule/${response.body.id}/_run_soon`)
          .set('kbn-xsrf', 'foo');
        expect(runSoonResponse.status).to.eql(204);
      });
    });

    it('should successfully run rule where task is stuck in a running status', async () => {
      // try running without forcing
      const runSoonResponse = await supertest
        .post(`${getUrlPrefix(``)}/internal/alerting/rule/${STUCK_RULE_ID}/_run_soon`)
        .set('kbn-xsrf', 'foo');
      expect(runSoonResponse.status).to.eql(200);
      expect(runSoonResponse.text).to.eql(`Rule is already running`);

      // now try running with force = true
      const runSoonForcedResponse = await supertest
        .post(`${getUrlPrefix(``)}/internal/alerting/rule/${STUCK_RULE_ID}/_run_soon?force=true`)
        .set('kbn-xsrf', 'foo');
      expect(runSoonForcedResponse.status).to.eql(204);
    });

    it('should return message when task does not exist for rule', async () => {
      const response = await supertest
        .post(`${getUrlPrefix(``)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData());

      expect(response.status).to.eql(200);
      objectRemover.add('default', response.body.id, 'rule', 'alerting');

      await es.delete({
        id: `task:${response.body.id}`,
        index: '.kibana_task_manager',
      });

      const runSoonResponse = await supertest
        .post(`${getUrlPrefix(``)}/internal/alerting/rule/${response.body.id}/_run_soon`)
        .set('kbn-xsrf', 'foo');
      expect(runSoonResponse.status).to.eql(200);
      expect(runSoonResponse.text).to.eql(
        `Error running rule: Saved object [task/${response.body.id}] not found`
      );
    });

    it('should return message when rule is disabled', async () => {
      const response = await supertest
        .post(`${getUrlPrefix(``)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData());

      expect(response.status).to.eql(200);
      objectRemover.add('default', response.body.id, 'rule', 'alerting');

      await supertest
        .post(`${getUrlPrefix(``)}/api/alerting/rule/${response.body.id}/_disable`)
        .set('kbn-xsrf', 'foo');

      const runSoonResponse = await supertest
        .post(`${getUrlPrefix(``)}/internal/alerting/rule/${response.body.id}/_run_soon`)
        .set('kbn-xsrf', 'foo');
      expect(runSoonResponse.status).to.eql(200);
      expect(runSoonResponse.text).to.eql(`Error running rule: rule is disabled`);
    });
  });
}
