/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ESTestIndexTool } from '@kbn/alerting-api-integration-helpers';

import { Spaces } from '../../../../../scenarios';
import type { FtrProviderContext } from '../../../../../../common/ftr_provider_context';
import { getUrlPrefix, ObjectRemover, getEventLog } from '../../../../../../common/lib';
import { createEsDocuments } from '../../../create_test_data';

const RULE_INTERVAL_SECONDS = 6;
const RULE_INTERVALS_TO_WRITE = 5;
const RULE_INTERVAL_MILLIS = RULE_INTERVAL_SECONDS * 1000;
const ES_GROUPS_TO_WRITE = 3;

export default function ruleTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const es = getService('es');
  const log = getService('log');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  describe('rule that implements cancellation services', () => {
    let endDate: string;
    const objectRemover = new ObjectRemover(supertest);

    beforeEach(async () => {
      // write documents in the future, figure out the end date
      const endDateMillis = Date.now() + (RULE_INTERVALS_TO_WRITE - 1) * RULE_INTERVAL_MILLIS;
      endDate = new Date(endDateMillis).toISOString();
    });

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    after(async () => {
      await esTestIndexTool.destroy();
    });

    before(async function () {
      const body = await es.info();
      if (!body.version.number.includes('SNAPSHOT')) {
        log.debug('Skipping because this build does not have the required shard_delay agg');
        this.skip();
        return;
      }
      await esTestIndexTool.setup();
    });

    it('runs successfully if it does not timeout', async () => {
      await createEsDocuments(
        es,
        esTestIndexTool,
        endDate,
        RULE_INTERVALS_TO_WRITE,
        RULE_INTERVAL_MILLIS,
        ES_GROUPS_TO_WRITE
      );
      const ruleId = await createRule({
        name: 'normal rule',
        ruleTypeId: 'test.cancellableRule',
        doLongSearch: false,
        doLongPostProcessing: false,
      });

      // get the events we're expecting
      const events = await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: Spaces.space1.id,
          type: 'alert',
          id: ruleId,
          provider: 'alerting',
          actions: new Map([['execute', { gte: 1 }]]),
        });
      });

      // execute event should have error status
      events.filter((event) => event?.event?.action === 'execute');
      expect(events[0]?.event?.outcome).to.eql('success');
      expect(events[0]?.kibana?.alerting?.status).to.eql('ok');
      expect(events[0]?.error?.message).to.be(undefined);

      // rule execution status should be in error with reason timeout
      const { status, body: rule } = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${ruleId}`
      );
      expect(status).to.eql(200);
      expect(rule.execution_status.status).to.eql('ok');
      expect(rule.execution_status.error).to.be(undefined);
    });

    it('throws an error if search runs longer than rule timeout', async () => {
      await createEsDocuments(
        es,
        esTestIndexTool,
        endDate,
        RULE_INTERVALS_TO_WRITE,
        RULE_INTERVAL_MILLIS,
        ES_GROUPS_TO_WRITE
      );
      const ruleId = await createRule({
        name: 'rule that takes a long time to query ES',
        ruleTypeId: 'test.cancellableRule',
        doLongSearch: true,
        doLongPostProcessing: false,
      });

      // get the events we're expecting
      const events = await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: Spaces.space1.id,
          type: 'alert',
          id: ruleId,
          provider: 'alerting',
          actions: new Map([['execute', { gte: 1 }]]),
        });
      });

      // execute event should have error status
      events.filter((event) => event?.event?.action === 'execute');
      expect(events[0]?.event?.outcome).to.eql('failure');
      expect(events[0]?.kibana?.alerting?.status).to.eql('error');
      // Timeouts will encounter one of the following two messages
      const expectedMessages = [
        'Request timed out',
        'Search has been aborted due to cancelled execution',
      ];
      expect(expectedMessages.includes(events[0]?.error?.message || '')).to.be(true);

      // rule execution status should be in error with reason timeout
      const { status, body: rule } = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${ruleId}`
      );
      expect(status).to.eql(200);
      expect(rule.execution_status.status).to.eql('error');
      expect(
        [
          'Request timed out',
          `test.cancellableRule:${ruleId}: execution cancelled due to timeout - exceeded rule type timeout of 3s`,
        ].includes(rule.execution_status.error.message)
      ).to.eql(true);
      expect(['timeout', 'execute'].includes(rule.execution_status.error.reason)).to.eql(true);
    });

    it('throws an error if execution is short circuited', async () => {
      await createEsDocuments(
        es,
        esTestIndexTool,
        endDate,
        RULE_INTERVALS_TO_WRITE,
        RULE_INTERVAL_MILLIS,
        ES_GROUPS_TO_WRITE
      );
      const ruleId = await createRule({
        name: 'rule that takes a long time to post process',
        ruleTypeId: 'test.cancellableRule',
        doLongSearch: false,
        doLongPostProcessing: true,
      });

      // get the events we're expecting
      const events = await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: Spaces.space1.id,
          type: 'alert',
          id: ruleId,
          provider: 'alerting',
          actions: new Map([['execute', { gte: 1 }]]),
        });
      });

      // execute event should have error status
      events.filter((event) => event?.event?.action === 'execute');
      expect(events[0]?.event?.outcome).to.eql('failure');
      expect(events[0]?.kibana?.alerting?.status).to.eql('error');
      expect(events[0]?.error?.message).to.eql('execution short circuited!');

      // rule execution status should be in error with reason timeout
      const { status, body: rule } = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${ruleId}`
      );
      expect(status).to.eql(200);
      expect(rule.execution_status.status).to.eql('error');
      expect(
        [
          'Request timed out',
          `test.cancellableRule:${ruleId}: execution cancelled due to timeout - exceeded rule type timeout of 3s`,
        ].includes(rule.execution_status.error.message)
      ).to.eql(true);
      expect(['timeout', 'execute'].includes(rule.execution_status.error.reason)).to.eql(true);
    });

    interface CreateRuleParams {
      name: string;
      ruleTypeId: string;
      doLongSearch: boolean;
      doLongPostProcessing: boolean;
    }

    async function createRule(params: CreateRuleParams): Promise<string> {
      const { status, body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: params.name,
          consumer: 'alerts',
          enabled: true,
          rule_type_id: params.ruleTypeId,
          schedule: { interval: `${RULE_INTERVAL_SECONDS}s` },
          actions: [],
          notify_when: 'onActiveAlert',
          params: {
            doLongSearch: params.doLongSearch,
            doLongPostProcessing: params.doLongPostProcessing,
          },
        });

      expect(status).to.be(200);

      const ruleId = createdRule.id;
      objectRemover.add(Spaces.space1.id, ruleId, 'rule', 'alerting');

      return ruleId;
    }
  });
}
