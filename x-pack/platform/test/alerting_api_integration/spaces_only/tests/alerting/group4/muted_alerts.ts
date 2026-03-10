/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import { ALERT_INSTANCE_ID, ALERT_RULE_UUID, ALERT_STATUS } from '@kbn/rule-data-utils';
import { nodeBuilder } from '@kbn/es-query';
import { Spaces } from '../../../scenarios';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../../common/lib';

const alertAsDataIndex = '.internal.alerts-observability.test.alerts.alerts-default-000001';

export default function createDisableRuleTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const supertest = getService('supertest');

  describe('mutedAlerts', () => {
    const objectRemover = new ObjectRemover(supertest);

    const createRule = async () => {
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

    const getAlerts = async () => {
      const {
        hits: { hits: alerts },
      } = await es.search({
        index: alertAsDataIndex,
        body: { query: { match_all: {} } },
      });

      return alerts;
    };

    afterEach(async () => {
      await es.deleteByQuery({
        index: alertAsDataIndex,
        query: {
          match_all: {},
        },
        conflicts: 'proceed',
        ignore_unavailable: true,
      });
      await objectRemover.removeAll();
    });

    it('should reflect muted alert instance ids in rule', async () => {
      const createdRule1 = await createRule();
      const createdRule2 = await createRule();

      let alerts: any[] = [];

      await retry.try(async () => {
        alerts = await getAlerts();

        expect(alerts.length).greaterThan(2);
        alerts.forEach((activeAlert: any) => {
          expect(activeAlert._source[ALERT_STATUS]).eql('active');
        });
      });

      const alertFromRule1 = alerts.find(
        (alert: any) =>
          alert._source[ALERT_STATUS] === 'active' &&
          alert._source[ALERT_RULE_UUID] === createdRule1
      );

      await supertest
        .post(
          `${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${encodeURIComponent(
            createdRule1
          )}/alert/${encodeURIComponent(alertFromRule1._source['kibana.alert.instance.id'])}/_mute`
        )
        .set('kbn-xsrf', 'foo')
        .expect(204);

      const ruleUuids = [createdRule1, createdRule2];

      const filterNode = nodeBuilder.or(
        ruleUuids.map((id) => nodeBuilder.is('alert.id', `alert:${id}`))
      );
      const { body: rules } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_find`)
        .set('kbn-xsrf', 'foo')
        .send({
          filter: JSON.stringify(filterNode),
          fields: ['id', 'mutedInstanceIds'],
          page: 1,
          per_page: ruleUuids.length,
        });

      expect(rules.data.length).to.be(2);
      const mutedRule = rules.data.find((rule: { id: string }) => rule.id === createdRule1);
      expect(mutedRule.muted_alert_ids).to.contain(alertFromRule1._source[ALERT_INSTANCE_ID]);
    });
  });
}
