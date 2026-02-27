/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ESTestIndexTool, ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import { ALERT_INSTANCE_ID, ALERT_RULE_UUID, ALERT_STATUS } from '@kbn/rule-data-utils';
import { Spaces } from '../../../scenarios';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { AlertUtils, getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../../common/lib';

const alertAsDataIndexPattern = '.internal.alerts-observability.test.alerts.alerts-default-*';

export default function muteValidationTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  describe('mute validation', () => {
    const objectRemover = new ObjectRemover(supertest);
    const alertUtils: AlertUtils = new AlertUtils({
      space: Spaces.space1,
      supertestWithoutAuth: supertest,
    });

    const createRule = async (): Promise<string> => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.always-firing-alert-as-data',
            schedule: { interval: '24h' },
            throttle: undefined,
            notify_when: undefined,
            params: {
              index: ES_TEST_INDEX_NAME,
              reference: 'test',
            },
          })
        )
        .expect(200);

      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');
      return createdRule.id;
    };

    const getAlertsByRuleId = async (ruleId: string): Promise<any[]> => {
      await es.indices.refresh({ index: alertAsDataIndexPattern, ignore_unavailable: true });
      const {
        hits: { hits: alerts },
      } = await es.search({
        index: alertAsDataIndexPattern,
        ignore_unavailable: true,
        query: {
          bool: {
            must: [{ term: { [ALERT_RULE_UUID]: ruleId } }, { term: { [ALERT_STATUS]: 'active' } }],
          },
        },
      });
      return alerts;
    };

    let ruleId: string;
    let alertInstanceId: string;

    before(async () => {
      await esTestIndexTool.setup();
    });

    beforeEach(async () => {
      ruleId = await createRule();
      await alertUtils.runSoon(ruleId);
      const alerts = await retry.try(async () => {
        const a = await getAlertsByRuleId(ruleId);
        if (a.length === 0) {
          await alertUtils.runSoon(ruleId);
          throw new Error('No alerts yet');
        }
        return a;
      });
      alertInstanceId = alerts[0]._source[ALERT_INSTANCE_ID];
    });

    afterEach(async () => {
      await es.deleteByQuery({
        index: alertAsDataIndexPattern,
        query: { match_all: {} },
        conflicts: 'proceed',
        ignore_unavailable: true,
      });
      await objectRemover.removeAll();
    });

    after(async () => {
      await esTestIndexTool.destroy();
    });

    it('returns 400 when body has only condition_operator', async () => {
      const { body, status } = await supertest
        .post(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/api/alerting/rule/${ruleId}/alert/${alertInstanceId}/_mute?validate_alerts_existence=false`
        )
        .set('kbn-xsrf', 'foo')
        .send({ condition_operator: 'all' });

      expect(status).to.eql(400);
      expect(body.message).to.contain('expires_at');
      expect(body.message).to.contain('conditions');
    });

    it('returns 400 when body has empty conditions array', async () => {
      const { body, status } = await supertest
        .post(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/api/alerting/rule/${ruleId}/alert/${alertInstanceId}/_mute?validate_alerts_existence=false`
        )
        .set('kbn-xsrf', 'foo')
        .send({ conditions: [] });

      expect(status).to.eql(400);
      expect(body.message).to.contain('expires_at');
      expect(body.message).to.contain('conditions');
    });

    it('returns 400 when body has invalid expires_at format', async () => {
      const { body, status } = await supertest
        .post(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/api/alerting/rule/${ruleId}/alert/${alertInstanceId}/_mute?validate_alerts_existence=false`
        )
        .set('kbn-xsrf', 'foo')
        .send({ expires_at: 'not-a-date' });

      expect(status).to.eql(400);
      expect(body.message).to.contain('valid ISO 8601');
    });

    it('returns 204 when body is empty object for indefinite mute', async () => {
      const { status } = await supertest
        .post(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/api/alerting/rule/${ruleId}/alert/${alertInstanceId}/_mute?validate_alerts_existence=false`
        )
        .set('kbn-xsrf', 'foo')
        .send({});

      expect(status).to.eql(204);
    });

    it('returns 204 when no body is sent for indefinite mute', async () => {
      const { status } = await supertest
        .post(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/api/alerting/rule/${ruleId}/alert/${alertInstanceId}/_mute?validate_alerts_existence=false`
        )
        .set('kbn-xsrf', 'foo');

      expect(status).to.eql(204);
    });
  });
}
