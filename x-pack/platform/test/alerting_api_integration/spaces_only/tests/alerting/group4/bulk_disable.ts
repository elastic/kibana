/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ALERT_STATUS, ALERT_UUID } from '@kbn/rule-data-utils';
import { STACK_AAD_INDEX_NAME } from '@kbn/stack-alerts-plugin/server/rule_types';
import { ESTestIndexTool, ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import { Spaces } from '../../../scenarios';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../../common/lib';
import { createEsDocumentsWithGroups } from '../create_test_data';

const alertsAsDataIndex = `.internal.alerts-${STACK_AAD_INDEX_NAME}.alerts-default-000001`;

const RULE_INTERVALS_TO_WRITE = 5;
const RULE_INTERVAL_SECONDS = 3;
const RULE_INTERVAL_MILLIS = RULE_INTERVAL_SECONDS * 1000;

export default function createDisableRuleTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  describe('bulkDisable', () => {
    let endDate: string;
    const objectRemover = new ObjectRemover(supertest);

    const createRule = async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: '.es-query',
            schedule: { interval: '1d' },
            throttle: null,
            notify_when: null,
            consumer: 'alerts',
            params: {
              threshold: [0],
              thresholdComparator: '>',
              timeField: 'date',
              esqlQuery: {
                esql: 'from kibana-alerting-test-data | stats c = count(date) by group | where c > 0',
              },
              searchType: 'esqlQuery',
              timeWindowSize: 1,
              timeWindowUnit: 'h',
              size: 100,
            },
            actions: [],
          })
        )
        .expect(200);

      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');
      return createdRule.id;
    };

    const getAlerts = async (ruleIds?: string[]) => {
      const query: any =
        ruleIds && ruleIds.length > 0
          ? {
              bool: {
                must: [
                  {
                    terms: {
                      'kibana.alert.rule.uuid': ruleIds,
                    },
                  },
                ],
              },
            }
          : { match_all: {} };

      const {
        hits: { hits: alerts },
      } = await es.search({
        index: alertsAsDataIndex,
        query,
      });

      return alerts;
    };

    const getAlertsById = async (alertIds?: string[]) => {
      const query: any =
        alertIds && alertIds.length > 0
          ? {
              bool: {
                must: [
                  {
                    terms: {
                      'kibana.alert.uuid': alertIds,
                    },
                  },
                ],
              },
            }
          : { match_all: {} };

      const {
        hits: { hits: alerts },
      } = await es.search({
        index: alertsAsDataIndex,
        query,
      });

      return alerts;
    };

    async function createEsDocumentsInGroups() {
      await createEsDocumentsWithGroups({
        es,
        esTestIndexTool,
        endDate,
        intervals: RULE_INTERVALS_TO_WRITE,
        intervalMillis: RULE_INTERVAL_MILLIS,
        groups: 3,
        indexName: ES_TEST_INDEX_NAME,
      });
    }

    before(async () => {
      await esTestIndexTool.setup();

      const endDateMillis = Date.now() + (RULE_INTERVALS_TO_WRITE - 1) * RULE_INTERVAL_MILLIS;
      endDate = new Date(endDateMillis).toISOString();
    });

    after(async () => {
      await objectRemover.removeAll();
      await esTestIndexTool.destroy();
    });

    it('should bulk disable and untrack', async () => {
      await createEsDocumentsInGroups();
      const createdRule1 = await createRule();
      const createdRule2 = await createRule();

      const alertIds: string[] = [];
      await retry.try(async () => {
        const alerts = await getAlerts([createdRule1, createdRule2]);

        expect(alerts.length).eql(2);
        alerts.forEach((activeAlert: any) => {
          expect(activeAlert._source[ALERT_STATUS]).eql('active');
          alertIds.push(activeAlert._source[ALERT_UUID]);
        });
      });

      await supertest
        .patch(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_bulk_disable`)
        .set('kbn-xsrf', 'foo')
        .send({
          ids: [createdRule1, createdRule2],
          untrack: true,
        })
        .expect(200);

      await retry.try(async () => {
        const alerts = await getAlertsById(alertIds);

        expect(alerts.length).eql(2);
        alerts.forEach((untrackedAlert: any) => {
          expect(untrackedAlert._source[ALERT_STATUS]).eql('untracked');
        });
      });
    });

    it('should bulk disable and not untrack if untrack is false', async () => {
      await createEsDocumentsInGroups();
      const createdRule1 = await createRule();
      const createdRule2 = await createRule();

      const alertIds: string[] = [];
      await retry.try(async () => {
        const alerts = await getAlerts([createdRule1, createdRule2]);

        expect(alerts.length).eql(2);
        alerts.forEach((activeAlert: any) => {
          expect(activeAlert._source[ALERT_STATUS]).eql('active');
          alertIds.push(activeAlert._source[ALERT_UUID]);
        });
      });

      await supertest
        .patch(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_bulk_disable`)
        .set('kbn-xsrf', 'foo')
        .send({
          ids: [createdRule1, createdRule2],
          untrack: false,
        })
        .expect(200);

      const alerts = await getAlertsById(alertIds);

      expect(alerts.length).eql(2);
      alerts.forEach((activeAlert: any) => {
        expect(activeAlert._source[ALERT_STATUS]).eql('active');
      });
    });
  });
}
