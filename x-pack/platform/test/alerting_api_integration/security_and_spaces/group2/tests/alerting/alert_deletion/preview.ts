/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import {
  DOCUMENT_SOURCE,
  createEsDocument,
} from '../../../../../spaces_only/tests/alerting/create_test_data';
import type { Space } from '../../../../../common/types';
import { Space1, SuperuserAtSpace1, UserAtSpaceScenarios } from '../../../../scenarios';
import { getUrlPrefix, getEventLog, ObjectRemover } from '../../../../../common/lib';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import {
  activeO11yAlertsOlderThan90,
  activeSecurityAlertsOlderThan90,
  activeStackAlertsOlderThan90,
  inactiveO11yAlertsOlderThan90,
  inactiveSecurityAlertsOlderThan90,
  inactiveStackAlertsOlderThan90,
  getTestAlertDocs,
} from './alert_deletion_test_utils';

export default function previewAlertDeletionTests({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const es = getService('es');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const objectRemover = new ObjectRemover(supertest);

  async function indexTestDocs() {
    const testAlertDocs = getTestAlertDocs();
    const operations = testAlertDocs.flatMap(({ _index, _id, _source: doc }) => {
      return [{ index: { _index, _id } }, doc];
    });
    await es.bulk({ refresh: 'wait_for', operations });
  }

  const getEventLogWithRetry = async (id: string, space: Space) => {
    await retry.try(async () => {
      return await getEventLog({
        getService,
        spaceId: space.id,
        type: 'alert',
        id,
        provider: 'alerting',
        actions: new Map([['execute', { equal: 1 }]]),
      });
    });
  };

  describe('preview alert deletion', () => {
    before(async () => {
      // We're in a non-default space, so we need a detection rule to run and generate alerts
      // in order to create the space-specific alerts index
      // write documents in the future, figure out the end date
      await createEsDocument(es, new Date().valueOf(), 1, ES_TEST_INDEX_NAME);

      // Create siem.queryRule
      const response = await supertestWithoutAuth
        .post(`${getUrlPrefix(Space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .auth(SuperuserAtSpace1.user.username, SuperuserAtSpace1.user.password)
        .send({
          enabled: true,
          name: 'test siem query rule',
          tags: [],
          rule_type_id: 'siem.queryRule',
          consumer: 'siem',
          schedule: { interval: '24h' },
          actions: [],
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
            index: [ES_TEST_INDEX_NAME],
            query: `source:${DOCUMENT_SOURCE}`,
            filters: [],
          },
        });

      const ruleId = response.body.id;
      objectRemover.add(Space1.id, ruleId, 'rule', 'alerting');
      await getEventLogWithRetry(ruleId, Space1);

      // delete the created alerts
      await es.deleteByQuery({
        index: '.internal.alerts-*',
        query: { match_all: {} },
        conflicts: 'proceed',
      });
    });

    beforeEach(async () => {
      await indexTestDocs();
    });

    afterEach(async () => {
      await es.deleteByQuery({
        index: '.internal.alerts-*',
        query: { match_all: {} },
        conflicts: 'proceed',
      });
    });

    after(async () => {
      await objectRemover.removeAll();
    });

    for (const scenario of UserAtSpaceScenarios) {
      describe(scenario.id, () => {
        it('should return the correct number of alerts to delete when previewing', async () => {
          const url = '/internal/alerting/rules/settings/_alert_delete_preview';

          const previewDeleteAllCategoryActiveAlerts = await supertestWithoutAuth
            .get(`${getUrlPrefix(scenario.space.id)}${url}`)
            .auth(scenario.user.username, scenario.user.password)
            .set('kbn-xsrf', 'foo')
            .query({
              active_alert_delete_threshold: 90,
              inactive_alert_delete_threshold: undefined,
              category_ids: ['management', 'observability', 'securitySolution'],
            })
            .send();

          const previewDeleteAllCategoryInactiveAlerts = await supertestWithoutAuth
            .get(`${getUrlPrefix(scenario.space.id)}${url}`)
            .auth(scenario.user.username, scenario.user.password)
            .set('kbn-xsrf', 'foo')
            .query({
              active_alert_delete_threshold: undefined,
              inactive_alert_delete_threshold: 90,
              category_ids: ['management', 'observability', 'securitySolution'],
            })
            .send();

          const previewDeleteAllCategoryActiveAndInactiveAlerts = await supertestWithoutAuth
            .get(`${getUrlPrefix(scenario.space.id)}${url}`)
            .auth(scenario.user.username, scenario.user.password)
            .set('kbn-xsrf', 'foo')
            .query({
              active_alert_delete_threshold: 90,
              inactive_alert_delete_threshold: 90,
              category_ids: ['management', 'observability', 'securitySolution'],
            })
            .send();

          const previewDeleteObservabilityActiveAlerts = await supertestWithoutAuth
            .get(`${getUrlPrefix(scenario.space.id)}${url}`)
            .auth(scenario.user.username, scenario.user.password)
            .set('kbn-xsrf', 'foo')
            .query({
              active_alert_delete_threshold: 90,
              inactive_alert_delete_threshold: undefined,
              category_ids: 'observability',
            })
            .send();

          const previewDeleteObservabilityInactiveAlerts = await supertestWithoutAuth
            .get(`${getUrlPrefix(scenario.space.id)}${url}`)
            .auth(scenario.user.username, scenario.user.password)
            .set('kbn-xsrf', 'foo')
            .query({
              active_alert_delete_threshold: undefined,
              inactive_alert_delete_threshold: 90,
              category_ids: 'observability',
            })
            .send();

          const previewDeleteObservabilityActiveAndInactiveAlerts = await supertestWithoutAuth
            .get(`${getUrlPrefix(scenario.space.id)}${url}`)
            .auth(scenario.user.username, scenario.user.password)
            .set('kbn-xsrf', 'foo')
            .query({
              active_alert_delete_threshold: 90,
              inactive_alert_delete_threshold: 90,
              category_ids: 'observability',
            })
            .send();

          const previewDeleteSecurityActiveAlerts = await supertestWithoutAuth
            .get(`${getUrlPrefix(scenario.space.id)}${url}`)
            .auth(scenario.user.username, scenario.user.password)
            .set('kbn-xsrf', 'foo')
            .query({
              active_alert_delete_threshold: 90,
              inactive_alert_delete_threshold: undefined,
              category_ids: 'securitySolution',
            })
            .send();

          const previewDeleteSecurityInactiveAlerts = await supertestWithoutAuth
            .get(`${getUrlPrefix(scenario.space.id)}${url}`)
            .auth(scenario.user.username, scenario.user.password)
            .set('kbn-xsrf', 'foo')
            .query({
              active_alert_delete_threshold: undefined,
              inactive_alert_delete_threshold: 90,
              category_ids: 'securitySolution',
            })
            .send();

          const previewDeleteSecurityActiveAndInactiveAlerts = await supertestWithoutAuth
            .get(`${getUrlPrefix(scenario.space.id)}${url}`)
            .auth(scenario.user.username, scenario.user.password)
            .set('kbn-xsrf', 'foo')
            .query({
              active_alert_delete_threshold: 90,
              inactive_alert_delete_threshold: 90,
              category_ids: 'securitySolution',
            })
            .send();

          const previewDeleteManagementActiveAlerts = await supertestWithoutAuth
            .get(`${getUrlPrefix(scenario.space.id)}${url}`)
            .auth(scenario.user.username, scenario.user.password)
            .set('kbn-xsrf', 'foo')
            .query({
              active_alert_delete_threshold: 90,
              inactive_alert_delete_threshold: undefined,
              category_ids: 'management',
            })
            .send();

          const previewDeleteManagementInactiveAlerts = await supertestWithoutAuth
            .get(`${getUrlPrefix(scenario.space.id)}${url}`)
            .auth(scenario.user.username, scenario.user.password)
            .set('kbn-xsrf', 'foo')
            .query({
              active_alert_delete_threshold: undefined,
              inactive_alert_delete_threshold: 90,
              category_ids: 'management',
            })
            .send();

          const previewDeleteManagementActiveAndInactiveAlerts = await supertestWithoutAuth
            .get(`${getUrlPrefix(scenario.space.id)}${url}`)
            .auth(scenario.user.username, scenario.user.password)
            .set('kbn-xsrf', 'foo')
            .query({
              active_alert_delete_threshold: 90,
              inactive_alert_delete_threshold: 90,
              category_ids: 'management',
            })
            .send();

          const previewDeleteMultiCategoryActiveAlerts = await supertestWithoutAuth
            .get(`${getUrlPrefix(scenario.space.id)}${url}`)
            .auth(scenario.user.username, scenario.user.password)
            .set('kbn-xsrf', 'foo')
            .query({
              active_alert_delete_threshold: 90,
              inactive_alert_delete_threshold: undefined,
              category_ids: ['observability', 'management'],
            })
            .send();

          const previewDeleteMultiCategoryInactiveAlerts = await supertestWithoutAuth
            .get(`${getUrlPrefix(scenario.space.id)}${url}`)
            .auth(scenario.user.username, scenario.user.password)
            .set('kbn-xsrf', 'foo')
            .query({
              active_alert_delete_threshold: undefined,
              inactive_alert_delete_threshold: 90,
              category_ids: ['observability', 'securitySolution'],
            })
            .send();

          const previewDeleteMultiCategoryActiveAndInactiveAlerts = await supertestWithoutAuth
            .get(`${getUrlPrefix(scenario.space.id)}${url}`)
            .auth(scenario.user.username, scenario.user.password)
            .set('kbn-xsrf', 'foo')
            .query({
              active_alert_delete_threshold: 90,
              inactive_alert_delete_threshold: 90,
              category_ids: ['securitySolution', 'management'],
            })
            .send();

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(previewDeleteAllCategoryActiveAlerts.statusCode).to.eql(403);
              expect(previewDeleteAllCategoryActiveAlerts.body).to.eql({
                error: 'Forbidden',
                message: `API [GET /internal/alerting/rules/settings/_alert_delete_preview?active_alert_delete_threshold=90&category_ids=management&category_ids=observability&category_ids=securitySolution] is unauthorized for user, this action is granted by the Kibana privileges [read-alert-delete-settings]`,
                statusCode: 403,
              });

              expect(previewDeleteAllCategoryInactiveAlerts.statusCode).to.eql(403);
              expect(previewDeleteAllCategoryInactiveAlerts.body).to.eql({
                error: 'Forbidden',
                message: `API [GET /internal/alerting/rules/settings/_alert_delete_preview?inactive_alert_delete_threshold=90&category_ids=management&category_ids=observability&category_ids=securitySolution] is unauthorized for user, this action is granted by the Kibana privileges [read-alert-delete-settings]`,
                statusCode: 403,
              });

              expect(previewDeleteAllCategoryActiveAndInactiveAlerts.statusCode).to.eql(403);
              expect(previewDeleteAllCategoryActiveAndInactiveAlerts.body).to.eql({
                error: 'Forbidden',
                message: `API [GET /internal/alerting/rules/settings/_alert_delete_preview?active_alert_delete_threshold=90&inactive_alert_delete_threshold=90&category_ids=management&category_ids=observability&category_ids=securitySolution] is unauthorized for user, this action is granted by the Kibana privileges [read-alert-delete-settings]`,
                statusCode: 403,
              });

              expect(previewDeleteObservabilityActiveAlerts.statusCode).to.eql(403);
              expect(previewDeleteObservabilityActiveAlerts.body).to.eql({
                error: 'Forbidden',
                message: `API [GET /internal/alerting/rules/settings/_alert_delete_preview?active_alert_delete_threshold=90&category_ids=observability] is unauthorized for user, this action is granted by the Kibana privileges [read-alert-delete-settings]`,
                statusCode: 403,
              });

              expect(previewDeleteObservabilityInactiveAlerts.statusCode).to.eql(403);
              expect(previewDeleteObservabilityInactiveAlerts.body).to.eql({
                error: 'Forbidden',
                message: `API [GET /internal/alerting/rules/settings/_alert_delete_preview?inactive_alert_delete_threshold=90&category_ids=observability] is unauthorized for user, this action is granted by the Kibana privileges [read-alert-delete-settings]`,
                statusCode: 403,
              });

              expect(previewDeleteObservabilityActiveAndInactiveAlerts.statusCode).to.eql(403);
              expect(previewDeleteObservabilityActiveAndInactiveAlerts.body).to.eql({
                error: 'Forbidden',
                message: `API [GET /internal/alerting/rules/settings/_alert_delete_preview?active_alert_delete_threshold=90&inactive_alert_delete_threshold=90&category_ids=observability] is unauthorized for user, this action is granted by the Kibana privileges [read-alert-delete-settings]`,
                statusCode: 403,
              });

              expect(previewDeleteSecurityActiveAlerts.statusCode).to.eql(403);
              expect(previewDeleteSecurityActiveAlerts.body).to.eql({
                error: 'Forbidden',
                message: `API [GET /internal/alerting/rules/settings/_alert_delete_preview?active_alert_delete_threshold=90&category_ids=securitySolution] is unauthorized for user, this action is granted by the Kibana privileges [read-alert-delete-settings]`,
                statusCode: 403,
              });

              expect(previewDeleteSecurityInactiveAlerts.statusCode).to.eql(403);
              expect(previewDeleteSecurityInactiveAlerts.body).to.eql({
                error: 'Forbidden',
                message: `API [GET /internal/alerting/rules/settings/_alert_delete_preview?inactive_alert_delete_threshold=90&category_ids=securitySolution] is unauthorized for user, this action is granted by the Kibana privileges [read-alert-delete-settings]`,
                statusCode: 403,
              });

              expect(previewDeleteSecurityActiveAndInactiveAlerts.statusCode).to.eql(403);
              expect(previewDeleteSecurityActiveAndInactiveAlerts.body).to.eql({
                error: 'Forbidden',
                message: `API [GET /internal/alerting/rules/settings/_alert_delete_preview?active_alert_delete_threshold=90&inactive_alert_delete_threshold=90&category_ids=securitySolution] is unauthorized for user, this action is granted by the Kibana privileges [read-alert-delete-settings]`,
                statusCode: 403,
              });

              expect(previewDeleteManagementActiveAlerts.statusCode).to.eql(403);
              expect(previewDeleteManagementActiveAlerts.body).to.eql({
                error: 'Forbidden',
                message: `API [GET /internal/alerting/rules/settings/_alert_delete_preview?active_alert_delete_threshold=90&category_ids=management] is unauthorized for user, this action is granted by the Kibana privileges [read-alert-delete-settings]`,
                statusCode: 403,
              });

              expect(previewDeleteManagementInactiveAlerts.statusCode).to.eql(403);
              expect(previewDeleteManagementInactiveAlerts.body).to.eql({
                error: 'Forbidden',
                message: `API [GET /internal/alerting/rules/settings/_alert_delete_preview?inactive_alert_delete_threshold=90&category_ids=management] is unauthorized for user, this action is granted by the Kibana privileges [read-alert-delete-settings]`,
                statusCode: 403,
              });

              expect(previewDeleteManagementActiveAndInactiveAlerts.statusCode).to.eql(403);
              expect(previewDeleteManagementActiveAndInactiveAlerts.body).to.eql({
                error: 'Forbidden',
                message: `API [GET /internal/alerting/rules/settings/_alert_delete_preview?active_alert_delete_threshold=90&inactive_alert_delete_threshold=90&category_ids=management] is unauthorized for user, this action is granted by the Kibana privileges [read-alert-delete-settings]`,
                statusCode: 403,
              });

              expect(previewDeleteMultiCategoryActiveAlerts.statusCode).to.eql(403);
              expect(previewDeleteMultiCategoryActiveAlerts.body).to.eql({
                error: 'Forbidden',
                message: `API [GET /internal/alerting/rules/settings/_alert_delete_preview?active_alert_delete_threshold=90&category_ids=observability&category_ids=management] is unauthorized for user, this action is granted by the Kibana privileges [read-alert-delete-settings]`,
                statusCode: 403,
              });

              expect(previewDeleteMultiCategoryInactiveAlerts.statusCode).to.eql(403);
              expect(previewDeleteMultiCategoryInactiveAlerts.body).to.eql({
                error: 'Forbidden',
                message: `API [GET /internal/alerting/rules/settings/_alert_delete_preview?inactive_alert_delete_threshold=90&category_ids=observability&category_ids=securitySolution] is unauthorized for user, this action is granted by the Kibana privileges [read-alert-delete-settings]`,
                statusCode: 403,
              });

              expect(previewDeleteMultiCategoryActiveAndInactiveAlerts.statusCode).to.eql(403);
              expect(previewDeleteMultiCategoryActiveAndInactiveAlerts.body).to.eql({
                error: 'Forbidden',
                message: `API [GET /internal/alerting/rules/settings/_alert_delete_preview?active_alert_delete_threshold=90&inactive_alert_delete_threshold=90&category_ids=securitySolution&category_ids=management] is unauthorized for user, this action is granted by the Kibana privileges [read-alert-delete-settings]`,
                statusCode: 403,
              });

              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(previewDeleteAllCategoryActiveAlerts.status).to.eql(200);
              expect(previewDeleteAllCategoryActiveAlerts.body.affected_alert_count).to.eql(
                activeStackAlertsOlderThan90.length +
                  activeO11yAlertsOlderThan90.length +
                  activeSecurityAlertsOlderThan90.length
              );

              expect(previewDeleteAllCategoryInactiveAlerts.status).to.eql(200);
              expect(previewDeleteAllCategoryInactiveAlerts.body.affected_alert_count).to.eql(
                inactiveStackAlertsOlderThan90.length +
                  inactiveO11yAlertsOlderThan90.length +
                  inactiveSecurityAlertsOlderThan90.length
              );

              expect(previewDeleteAllCategoryActiveAndInactiveAlerts.status).to.eql(200);
              expect(
                previewDeleteAllCategoryActiveAndInactiveAlerts.body.affected_alert_count
              ).to.eql(
                activeStackAlertsOlderThan90.length +
                  activeO11yAlertsOlderThan90.length +
                  activeSecurityAlertsOlderThan90.length +
                  inactiveStackAlertsOlderThan90.length +
                  inactiveO11yAlertsOlderThan90.length +
                  inactiveSecurityAlertsOlderThan90.length
              );

              expect(previewDeleteObservabilityActiveAlerts.status).to.eql(200);
              expect(previewDeleteObservabilityActiveAlerts.body.affected_alert_count).to.eql(
                activeO11yAlertsOlderThan90.length
              );

              expect(previewDeleteObservabilityInactiveAlerts.status).to.eql(200);
              expect(previewDeleteObservabilityInactiveAlerts.body.affected_alert_count).to.eql(
                inactiveO11yAlertsOlderThan90.length
              );

              expect(previewDeleteObservabilityActiveAndInactiveAlerts.status).to.eql(200);
              expect(
                previewDeleteObservabilityActiveAndInactiveAlerts.body.affected_alert_count
              ).to.eql(activeO11yAlertsOlderThan90.length + inactiveO11yAlertsOlderThan90.length);

              expect(previewDeleteSecurityActiveAlerts.status).to.eql(200);
              expect(previewDeleteSecurityActiveAlerts.body.affected_alert_count).to.eql(
                activeSecurityAlertsOlderThan90.length
              );

              expect(previewDeleteSecurityInactiveAlerts.status).to.eql(200);
              expect(previewDeleteSecurityInactiveAlerts.body.affected_alert_count).to.eql(
                inactiveSecurityAlertsOlderThan90.length
              );

              expect(previewDeleteSecurityActiveAndInactiveAlerts.status).to.eql(200);
              expect(previewDeleteSecurityActiveAndInactiveAlerts.body.affected_alert_count).to.eql(
                activeSecurityAlertsOlderThan90.length + inactiveSecurityAlertsOlderThan90.length
              );

              expect(previewDeleteManagementActiveAlerts.status).to.eql(200);
              expect(previewDeleteManagementActiveAlerts.body.affected_alert_count).to.eql(
                activeStackAlertsOlderThan90.length
              );

              expect(previewDeleteManagementInactiveAlerts.status).to.eql(200);
              expect(previewDeleteManagementInactiveAlerts.body.affected_alert_count).to.eql(
                inactiveStackAlertsOlderThan90.length
              );

              expect(previewDeleteManagementActiveAndInactiveAlerts.status).to.eql(200);
              expect(
                previewDeleteManagementActiveAndInactiveAlerts.body.affected_alert_count
              ).to.eql(activeStackAlertsOlderThan90.length + inactiveStackAlertsOlderThan90.length);

              expect(previewDeleteMultiCategoryActiveAlerts.status).to.eql(200);
              expect(previewDeleteMultiCategoryActiveAlerts.body.affected_alert_count).to.eql(
                activeStackAlertsOlderThan90.length + activeO11yAlertsOlderThan90.length
              );

              expect(previewDeleteMultiCategoryInactiveAlerts.status).to.eql(200);
              expect(previewDeleteMultiCategoryInactiveAlerts.body.affected_alert_count).to.eql(
                inactiveO11yAlertsOlderThan90.length + inactiveSecurityAlertsOlderThan90.length
              );

              expect(previewDeleteMultiCategoryActiveAndInactiveAlerts.status).to.eql(200);
              expect(
                previewDeleteMultiCategoryActiveAndInactiveAlerts.body.affected_alert_count
              ).to.eql(
                activeStackAlertsOlderThan90.length +
                  activeSecurityAlertsOlderThan90.length +
                  inactiveStackAlertsOlderThan90.length +
                  inactiveSecurityAlertsOlderThan90.length
              );
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });
}
