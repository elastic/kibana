/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ESTestIndexTool, ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import { RecoveredActionGroup } from '@kbn/alerting-plugin/common';

import { Spaces } from '../../../../../scenarios';
import type { FtrProviderContext } from '../../../../../../common/ftr_provider_context';
import { getUrlPrefix, ObjectRemover, TaskManagerUtils } from '../../../../../../common/lib';
import { createEsDocuments } from '../../../create_test_data';

const RULE_INTERVAL_SECONDS = 6;
const RULE_INTERVALS_TO_WRITE = 5;
const RULE_INTERVAL_MILLIS = RULE_INTERVAL_SECONDS * 1000;
const ES_GROUPS_TO_WRITE = 3;

export default function ruleTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const es = getService('es');
  const esTestIndexTool = new ESTestIndexTool(es, retry);
  const taskManagerUtils = new TaskManagerUtils(es, retry);

  describe('rule that sets autoRecoverAlerts to false', () => {
    let endDate: string;
    const objectRemover = new ObjectRemover(supertest);

    before(async () => {
      await esTestIndexTool.setup();
    });

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

    it('runs successfully and does not auto recover', async () => {
      const testStart = new Date();
      await createEsDocuments(
        es,
        esTestIndexTool,
        endDate,
        RULE_INTERVALS_TO_WRITE,
        RULE_INTERVAL_MILLIS,
        ES_GROUPS_TO_WRITE
      );

      await createRule({
        name: 'test rule',
        pattern: [true, false, true],
      });

      await taskManagerUtils.waitForActionTaskParamsToBeCleanedUp(testStart);

      const actionTestRecord = await esTestIndexTool.waitForDocs('action:test.index-record', '', 2);

      await esTestIndexTool.search('alert:test.patternFiringAutoRecoverFalse', '');

      expect(actionTestRecord[0]._source.params.message).to.eql('Active message');
      expect(actionTestRecord[1]._source.params.message).to.eql('Active message');
    });

    interface CreateRuleParams {
      name: string;
      pattern: boolean[];
    }

    async function createRule(params: CreateRuleParams) {
      const { body: createdConnector } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My Connector',
          connector_type_id: 'test.index-record',
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
          secrets: {
            encrypted: 'This value should be encrypted',
          },
        })
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdConnector.id, 'connector', 'actions');

      const { status, body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: params.name,
          consumer: 'alerts',
          enabled: true,
          rule_type_id: 'test.patternFiringAutoRecoverFalse',
          schedule: { interval: '1s' },
          actions: [
            {
              group: 'default',
              id: createdConnector.id,
              params: {
                index: ES_TEST_INDEX_NAME,
                reference: '',
                message: 'Active message',
              },
            },
            {
              group: RecoveredActionGroup.id,
              id: createdConnector.id,
              params: {
                index: ES_TEST_INDEX_NAME,
                reference: '',
                message: 'Recovered message',
              },
            },
          ],
          notify_when: 'onThrottleInterval',
          params: {
            pattern: {
              instance: params.pattern,
            },
          },
        });

      expect(status).to.be(200);
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');
    }
  });
}
