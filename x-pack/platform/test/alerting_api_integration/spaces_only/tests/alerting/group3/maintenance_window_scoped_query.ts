/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Alert } from '@kbn/alerts-as-data-utils';
import { ALERT_MAINTENANCE_WINDOW_IDS } from '@kbn/rule-data-utils';
import { getEventLog, getTestRuleData, getUrlPrefix, ObjectRemover } from '../../../../common/lib';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  createRule,
  createAction,
  createMaintenanceWindow,
  getRuleEvents,
  expectNoActionsFired,
} from './test_helpers';
import { Spaces } from '../../../scenarios';
import { runSoon } from '../../helpers';
import { ES_TEST_DATA_STREAM_NAME, getRuleServices } from './builtin_alert_types/es_query/common';
import { createDataStream, deleteDataStream, DOCUMENT_SOURCE } from '../create_test_data';

const alertAsDataIndex = '.internal.alerts-test.patternfiring.alerts-default-000001';
const securityAlertsAsDataIndex = '.alerts-security.alerts-default';

export const ES_GROUPS_TO_WRITE = 2;

export default function maintenanceWindowScopedQueryTests({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');
  const retry = getService('retry');

  const {
    es,
    esTestIndexTool,
    esTestIndexToolDataStream,
    createEsDocumentsInGroups,
    removeAllAADDocs,
  } = getRuleServices(getService);

  describe('maintenanceWindowScopedQuery', () => {
    const objectRemover = new ObjectRemover(supertestWithoutAuth);

    beforeEach(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();

      await createDataStream(es, ES_TEST_DATA_STREAM_NAME);

      await removeAllAADDocs();
    });

    afterEach(async () => {
      await objectRemover.removeAll();
      await esTestIndexTool.destroy();
      await deleteDataStream(es, ES_TEST_DATA_STREAM_NAME);
      await es.deleteByQuery({
        index: alertAsDataIndex,
        query: {
          match_all: {},
        },
        conflicts: 'proceed',
      });
      await es.deleteByQuery({
        index: securityAlertsAsDataIndex,
        query: {
          match_all: {},
        },
        conflicts: 'proceed',
      });
    });

    it('should associate alerts muted by maintenance window scoped query', async () => {
      const pattern = {
        instance: [true, true, false, true],
      };
      // Create active maintenance window
      const maintenanceWindow = await createMaintenanceWindow({
        supertest,
        objectRemover,
        overwrites: {
          scoped_query: {
            kql: 'kibana.alert.rule.name: "test-rule"',
            filters: [],
          },
          category_ids: ['management'],
        },
      });

      // Create action and rule
      const action = await await createAction({
        supertest,
        objectRemover,
      });

      const rule = await createRule({
        actionId: action.id,
        pattern,
        supertest,
        objectRemover,
        overwrites: {
          rule_type_id: 'test.patternFiringAad',
        },
      });

      // Run the first time - active
      await getRuleEvents({
        id: rule.id,
        activeInstance: 1,
        retry,
        getService,
      });

      await expectNoActionsFired({
        id: rule.id,
        supertest,
        retry,
      });

      // Ensure we wrote the new maintenance window ID to the alert doc
      await retry.try(async () => {
        const result = await es.search<Alert>({
          index: alertAsDataIndex,
          query: { match_all: {} },
        });

        expect(result.hits.hits[0]?._source?.[ALERT_MAINTENANCE_WINDOW_IDS]).eql([
          maintenanceWindow.id,
        ]);
      });

      await runSoon({
        id: rule.id,
        supertest,
        retry,
      });

      await getRuleEvents({
        id: rule.id,
        activeInstance: 2,
        retry,
        getService,
      });

      await expectNoActionsFired({
        id: rule.id,
        supertest,
        retry,
      });
    });

    it('should associate persistence alerts muted by maintenance window scoped query', async () => {
      // write documents from now to the future end date in groups
      await createEsDocumentsInGroups(
        ES_GROUPS_TO_WRITE,
        new Date().toISOString(),
        esTestIndexToolDataStream,
        ES_TEST_DATA_STREAM_NAME
      );
      // Create active maintenance window
      const maintenanceWindow = await createMaintenanceWindow({
        supertest,
        objectRemover,
        spaceId: 'default',
        overwrites: {
          scoped_query: {
            kql: 'kibana.alert.rule.name: "test-rule"',
            filters: [],
          },
          category_ids: ['securitySolution'],
        },
      });

      // Create action and rule
      const action = await createAction({ supertest, objectRemover, spaceId: 'default' });

      const { body: rule } = await supertest
        .post(`/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send({
          enabled: true,
          name: 'test-rule',
          rule_type_id: 'siem.queryRule',
          schedule: { interval: '24h' },
          consumer: 'siem',
          actions: [
            {
              id: action.id,
              params: {},
              frequency: { notify_when: 'onActiveAlert', throttle: null, summary: false },
              group: 'default',
            },
          ],
          params: {
            author: [],
            description: 'test',
            falsePositives: [],
            from: 'now-86460s',
            ruleId: '31c54f10-9d3b-45a8-b064-b92e8c6fcbe7',
            immutable: false,
            license: '',
            outputIndex: '',
            meta: {
              from: '1m',
              kibana_siem_app_url: 'https://localhost:5601/app/security',
            },
            maxSignals: 20,
            riskScore: 21,
            riskScoreMapping: [],
            severity: 'low',
            severityMapping: [],
            threat: [],
            to: 'now',
            references: [],
            version: 1,
            exceptionsList: [],
            relatedIntegrations: [],
            requiredFields: [],
            setup: '',
            type: 'query',
            language: 'kuery',
            index: [ES_TEST_DATA_STREAM_NAME],
            query: `source:${DOCUMENT_SOURCE}`,
            filters: [],
          },
        })
        .expect(200);
      objectRemover.add(Spaces.default.id, rule.id, 'rule', 'alerting');

      // should generate 10 alerts when run
      const executeEvent = await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: 'default',
          type: 'alert',
          id: rule.id,
          provider: 'alerting',
          actions: new Map([['execute', { equal: 1 }]]),
        });
      });

      expect(executeEvent[0]?.kibana?.alert?.rule?.execution?.metrics?.alert_counts?.active).to.be(
        10
      );

      await expectNoActionsFired({ id: rule.id, supertest, retry, spaceId: 'default' });

      // Ensure we wrote the new maintenance window ID to the alert doc
      await retry.try(async () => {
        const result = await es.search<Alert>({
          index: securityAlertsAsDataIndex,
          query: { match_all: {} },
        });

        expect(result.hits.hits.length).to.be(10);

        for (const hit of result.hits.hits) {
          expect(hit._source?.[ALERT_MAINTENANCE_WINDOW_IDS]).to.eql([maintenanceWindow.id]);
        }
      });
    });

    it('should not associate alerts if scoped query does not match the alert', async () => {
      const pattern = {
        instance: [true, true, false, true],
      };
      // Create active maintenance window
      await createMaintenanceWindow({
        supertest,
        objectRemover,
        overwrites: {
          scoped_query: {
            kql: 'kibana.alert.rule.name: "wrong-rule"',
            filters: [],
          },
          category_ids: ['management'],
        },
      });

      // Create action and rule
      const action = await await createAction({
        supertest,
        objectRemover,
      });

      const rule = await createRule({
        actionId: action.id,
        pattern,
        supertest,
        objectRemover,
        overwrites: {
          rule_type_id: 'test.patternFiringAad',
        },
      });

      // Run the first time - active - has action
      await getRuleEvents({
        id: rule.id,
        action: 1,
        activeInstance: 1,
        retry,
        getService,
      });

      await runSoon({
        id: rule.id,
        supertest,
        retry,
      });

      await getRuleEvents({
        id: rule.id,
        action: 2,
        activeInstance: 2,
        retry,
        getService,
      });
    });

    it('should not associate persistence alerts if scoped query does not match the alert', async () => {
      // write documents from now to the future end date in groups
      await createEsDocumentsInGroups(
        ES_GROUPS_TO_WRITE,
        new Date().toISOString(),
        esTestIndexToolDataStream,
        ES_TEST_DATA_STREAM_NAME
      );
      // Create active maintenance window
      await createMaintenanceWindow({
        supertest,
        objectRemover,
        spaceId: 'default',
        overwrites: {
          scoped_query: {
            kql: 'kibana.alert.rule.name: "wrong-rule"',
            filters: [],
          },
          category_ids: ['securitySolution'],
        },
      });

      // Create action and rule
      const action = await createAction({ supertest, objectRemover, spaceId: 'default' });

      const { body: rule } = await supertest
        .post(`/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send({
          enabled: true,
          name: 'test-rule',
          rule_type_id: 'siem.queryRule',
          schedule: { interval: '24h' },
          consumer: 'siem',
          actions: [
            {
              id: action.id,
              params: {},
              frequency: { notify_when: 'onActiveAlert', throttle: null, summary: false },
              group: 'default',
            },
          ],
          params: {
            author: [],
            description: 'test',
            falsePositives: [],
            from: 'now-86460s',
            ruleId: '31c54f10-9d3b-45a8-b064-b92e8c6fcbe7',
            immutable: false,
            license: '',
            outputIndex: '',
            meta: {
              from: '1m',
              kibana_siem_app_url: 'https://localhost:5601/app/security',
            },
            maxSignals: 20,
            riskScore: 21,
            riskScoreMapping: [],
            severity: 'low',
            severityMapping: [],
            threat: [],
            to: 'now',
            references: [],
            version: 1,
            exceptionsList: [],
            relatedIntegrations: [],
            requiredFields: [],
            setup: '',
            type: 'query',
            language: 'kuery',
            index: [ES_TEST_DATA_STREAM_NAME],
            query: `source:${DOCUMENT_SOURCE}`,
            filters: [],
          },
        })
        .expect(200);
      objectRemover.add(Spaces.default.id, rule.id, 'rule', 'alerting');

      // should generate 10 alerts when run
      const executeEvent = await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: 'default',
          type: 'alert',
          id: rule.id,
          provider: 'alerting',
          actions: new Map([['execute', { equal: 1 }]]),
        });
      });

      expect(executeEvent[0]?.kibana?.alert?.rule?.execution?.metrics?.alert_counts?.active).to.be(
        10
      );

      // Ensure no maintenance window ID in the alert doc
      await retry.try(async () => {
        const result = await es.search<Alert>({
          index: securityAlertsAsDataIndex,
          query: { match_all: {} },
        });

        expect(result.hits.hits.length).to.be(10);

        for (const hit of result.hits.hits) {
          expect(hit._source?.[ALERT_MAINTENANCE_WINDOW_IDS]).to.be(undefined);
        }
      });
    });

    it('should associate alerts for rules that generate multiple alerts', async () => {
      await createMaintenanceWindow({
        supertest,
        objectRemover,
        overwrites: {
          scoped_query: {
            kql: 'kibana.alert.rule.tags: "test"',
            filters: [],
          },
          category_ids: ['management'],
        },
      });

      // Create action and rule
      const action = await await createAction({
        supertest,
        objectRemover,
      });

      const { body: rule } = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            name: 'test-rule',
            rule_type_id: 'test.always-firing-alert-as-data',
            schedule: { interval: '24h' },
            tags: ['test'],
            throttle: undefined,
            notify_when: 'onActiveAlert',
            params: {
              index: alertAsDataIndex,
              reference: 'test',
            },
            actions: [
              {
                id: action.id,
                group: 'default',
                params: {},
              },
              {
                id: action.id,
                group: 'recovered',
                params: {},
              },
            ],
          })
        )
        .expect(200);

      objectRemover.add(Spaces.space1.id, rule.id, 'rule', 'alerting');

      // Run the first time - active
      await getRuleEvents({
        id: rule.id,
        activeInstance: 2,
        retry,
        getService,
      });

      await expectNoActionsFired({
        id: rule.id,
        supertest,
        retry,
      });
    });

    it('should associate alerts when scoped query contains wildcards', async () => {
      await createMaintenanceWindow({
        supertest,
        objectRemover,
        overwrites: {
          scoped_query: {
            kql: 'kibana.alert.rule.name: *test*',
            filters: [],
          },
          category_ids: ['management'],
        },
      });

      // Create action and rule
      const action = await await createAction({
        supertest,
        objectRemover,
      });

      const { body: rule } = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            name: 'rule-test-rule',
            rule_type_id: 'test.always-firing-alert-as-data',
            schedule: { interval: '24h' },
            tags: ['test'],
            throttle: undefined,
            notify_when: 'onActiveAlert',
            params: {
              index: alertAsDataIndex,
              reference: 'test',
            },
            actions: [
              {
                id: action.id,
                group: 'default',
                params: {},
              },
              {
                id: action.id,
                group: 'recovered',
                params: {},
              },
            ],
          })
        )
        .expect(200);

      objectRemover.add(Spaces.space1.id, rule.id, 'rule', 'alerting');

      // Run the first time - active
      await getRuleEvents({
        id: rule.id,
        activeInstance: 2,
        retry,
        getService,
      });

      await expectNoActionsFired({
        id: rule.id,
        supertest,
        retry,
      });
    });

    it('should associate persistence alerts when scoped query contains wildcards', async () => {
      // write documents from now to the future end date in groups
      await createEsDocumentsInGroups(
        ES_GROUPS_TO_WRITE,
        new Date().toISOString(),
        esTestIndexToolDataStream,
        ES_TEST_DATA_STREAM_NAME
      );

      const maintenanceWindow = await createMaintenanceWindow({
        supertest,
        objectRemover,
        spaceId: 'default',
        overwrites: {
          scoped_query: {
            kql: 'kibana.alert.rule.name: *test*',
            filters: [],
          },
          category_ids: ['securitySolution'],
        },
      });

      // Create action and rule
      const action = await createAction({ supertest, objectRemover, spaceId: 'default' });

      const { body: rule } = await supertest
        .post(`/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send({
          enabled: true,
          name: 'rule-test-rule',
          rule_type_id: 'siem.queryRule',
          schedule: { interval: '24h' },
          consumer: 'siem',
          actions: [
            {
              id: action.id,
              params: {},
              frequency: { notify_when: 'onActiveAlert', throttle: null, summary: false },
              group: 'default',
            },
          ],
          params: {
            author: [],
            description: 'test',
            falsePositives: [],
            from: 'now-86460s',
            ruleId: '31c54f10-9d3b-45a8-b064-b92e8c6fcbe7',
            immutable: false,
            license: '',
            outputIndex: '',
            meta: {
              from: '1m',
              kibana_siem_app_url: 'https://localhost:5601/app/security',
            },
            maxSignals: 20,
            riskScore: 21,
            riskScoreMapping: [],
            severity: 'low',
            severityMapping: [],
            threat: [],
            to: 'now',
            references: [],
            version: 1,
            exceptionsList: [],
            relatedIntegrations: [],
            requiredFields: [],
            setup: '',
            type: 'query',
            language: 'kuery',
            index: [ES_TEST_DATA_STREAM_NAME],
            query: `source:${DOCUMENT_SOURCE}`,
            filters: [],
          },
        })
        .expect(200);
      objectRemover.add(Spaces.default.id, rule.id, 'rule', 'alerting');

      // should generate 10 alerts when run
      const executeEvent = await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: 'default',
          type: 'alert',
          id: rule.id,
          provider: 'alerting',
          actions: new Map([['execute', { equal: 1 }]]),
        });
      });

      expect(executeEvent[0]?.kibana?.alert?.rule?.execution?.metrics?.alert_counts?.active).to.be(
        10
      );

      await expectNoActionsFired({ id: rule.id, supertest, retry, spaceId: 'default' });

      // Ensure we wrote the new maintenance window ID to the alert doc
      await retry.try(async () => {
        const result = await es.search<Alert>({
          index: securityAlertsAsDataIndex,
          query: { match_all: {} },
        });

        expect(result.hits.hits.length).to.be(10);

        for (const hit of result.hits.hits) {
          expect(hit._source?.[ALERT_MAINTENANCE_WINDOW_IDS]).to.eql([maintenanceWindow.id]);
        }
      });
    });
  });
}
