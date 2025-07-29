/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import type { IValidatedEvent } from '@kbn/event-log-plugin/server';
import { ALERT_CASE_IDS } from '@kbn/rule-data-utils';
import moment from 'moment';
import {
  DOCUMENT_SOURCE,
  createEsDocument,
} from '../../../../../spaces_only/tests/alerting/create_test_data';
import type { Space } from '../../../../../common/types';
import type { Scenario } from '../../../../scenarios';
import {
  Space1,
  Space2,
  SuperuserAtSpace1,
  Space1AllAtSpace1,
  UserAtSpaceScenarios,
} from '../../../../scenarios';
import { getUrlPrefix, getEventLog, ObjectRemover } from '../../../../../common/lib';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import {
  activeO11yAlertsOlderThan90,
  activeO11yAlertsNewerThan90,
  activeSecurityAlertsOlderThan90,
  activeSecurityAlertsNewerThan90,
  activeStackAlertsOlderThan90,
  activeStackAlertsNewerThan90,
  inactiveO11yAlertsOlderThan90,
  inactiveO11yAlertsNewerThan90,
  inactiveSecurityAlertsOlderThan90,
  inactiveSecurityAlertsNewerThan90,
  inactiveStackAlertsOlderThan90,
  inactiveStackAlertsNewerThan90,
  getTestAlertDocs,
  getRecoveredAlert,
  getActiveAlert,
} from './alert_deletion_test_utils';

export default function alertDeletionTests({ getService }: FtrProviderContext) {
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

  const cleanupEventLog = async () => {
    await retry.try(async () => {
      const results = await es.deleteByQuery({
        index: '.kibana-event-log*',
        query: { bool: { must: [{ match: { 'event.action': 'delete-alerts' } }] } },
        conflicts: 'proceed',
      });
      expect((results?.deleted ?? 0) > 0).to.eql(true);
    });
  };

  const doSchedule = async (
    scenario: Scenario,
    body: {
      active_alert_deletion_threshold?: number;
      inactive_alert_delete_threshold?: number;
      category_ids: string[];
    }
  ) => {
    return await await supertestWithoutAuth
      .post(
        `${getUrlPrefix(scenario.space.id)}/internal/alerting/rules/settings/_alert_delete_schedule`
      )
      .auth(scenario.user.username, scenario.user.password)
      .set('kbn-xsrf', 'foo')
      .send(body);
  };

  const testExpectedAlertsAreDeleted = async (
    expectedAlertsIds: string[],
    deletedAlertIds: string[]
  ) => {
    // wait for the task to complete
    await retry.try(async () => {
      const results = await es.search<IValidatedEvent>({
        index: '.kibana-event-log*',
        query: { bool: { must: [{ match: { 'event.action': 'delete-alerts' } }] } },
      });
      expect(results.hits.hits.length).to.eql(1);
      expect(results.hits.hits[0]._source?.event?.outcome).to.eql('success');
      expect(results.hits.hits[0]._source?.kibana?.alert?.deletion?.num_deleted).to.eql(
        deletedAlertIds.length
      );
    });

    await retry.try(async () => {
      // query for alerts
      const alerts = await es.search({
        index: '.internal.alerts-*',
        size: 100,
        query: { match_all: {} },
      });
      expect(alerts.hits.hits.length).to.eql(expectedAlertsIds.length);
      expectedAlertsIds.forEach((alertId) => {
        expect(alerts.hits.hits.findIndex((a) => a._id === alertId)).to.be.greaterThan(-1);
      });
    });
  };

  describe('schedule alert deletion', () => {
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
        it('should delete the correct of alerts - all category active alerts', async () => {
          let scheduleResponse;
          const taskBody = {
            active_alert_delete_threshold: 90,
            inactive_alert_delete_threshold: undefined,
            category_ids: ['management', 'securitySolution', 'observability'],
          };

          switch (scenario.id) {
            case 'global_read at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'space_1_all_alerts_none_actions at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              await retry.try(async () => {
                scheduleResponse = await doSchedule(scenario, taskBody);
                expect(scheduleResponse.status).to.eql(204);
              });

              const expectedAlerts = [
                ...inactiveStackAlertsOlderThan90,
                ...inactiveStackAlertsNewerThan90,
                ...activeStackAlertsNewerThan90,
                ...inactiveO11yAlertsOlderThan90,
                ...inactiveO11yAlertsNewerThan90,
                ...activeO11yAlertsNewerThan90,
                ...inactiveSecurityAlertsOlderThan90,
                ...inactiveSecurityAlertsNewerThan90,
                ...activeSecurityAlertsNewerThan90,
              ];

              const deletedAlerts = [
                ...activeStackAlertsOlderThan90,
                ...activeO11yAlertsOlderThan90,
                ...activeSecurityAlertsOlderThan90,
              ];

              await testExpectedAlertsAreDeleted(
                expectedAlerts.map((a) => a.space1.id),
                deletedAlerts.map((a) => a.space1.id)
              );
              await cleanupEventLog();
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should delete the correct of alerts - all category inactive alerts', async () => {
          let scheduleResponse;
          const taskBody = {
            active_alert_delete_threshold: undefined,
            inactive_alert_delete_threshold: 90,
            category_ids: ['management', 'securitySolution', 'observability'],
          };

          switch (scenario.id) {
            case 'global_read at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'space_1_all_alerts_none_actions at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              await retry.try(async () => {
                scheduleResponse = await doSchedule(scenario, taskBody);
                expect(scheduleResponse.status).to.eql(204);
              });

              const expectedAlerts = [
                ...inactiveStackAlertsNewerThan90,
                ...activeStackAlertsOlderThan90,
                ...activeStackAlertsNewerThan90,
                ...inactiveO11yAlertsNewerThan90,
                ...activeO11yAlertsOlderThan90,
                ...activeO11yAlertsNewerThan90,
                ...inactiveSecurityAlertsNewerThan90,
                ...activeSecurityAlertsOlderThan90,
                ...activeSecurityAlertsNewerThan90,
              ];

              const deletedAlerts = [
                ...inactiveStackAlertsOlderThan90,
                ...inactiveO11yAlertsOlderThan90,
                ...inactiveSecurityAlertsOlderThan90,
              ];

              await testExpectedAlertsAreDeleted(
                expectedAlerts.map((a) => a.space1.id),
                deletedAlerts.map((a) => a.space1.id)
              );
              await cleanupEventLog();
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should delete the correct of alerts - all category active and inactive alerts', async () => {
          let scheduleResponse;
          const taskBody = {
            active_alert_delete_threshold: 90,
            inactive_alert_delete_threshold: 90,
            category_ids: ['management', 'securitySolution', 'observability'],
          };

          switch (scenario.id) {
            case 'global_read at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'space_1_all_alerts_none_actions at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              await retry.try(async () => {
                scheduleResponse = await doSchedule(scenario, taskBody);
                expect(scheduleResponse.status).to.eql(204);
              });

              const expectedAlerts = [
                ...inactiveStackAlertsNewerThan90,
                ...activeStackAlertsNewerThan90,
                ...inactiveO11yAlertsNewerThan90,
                ...activeO11yAlertsNewerThan90,
                ...inactiveSecurityAlertsNewerThan90,
                ...activeSecurityAlertsNewerThan90,
              ];

              const deletedAlerts = [
                ...inactiveStackAlertsOlderThan90,
                ...activeStackAlertsOlderThan90,
                ...inactiveO11yAlertsOlderThan90,
                ...activeO11yAlertsOlderThan90,
                ...inactiveSecurityAlertsOlderThan90,
                ...activeSecurityAlertsOlderThan90,
              ];

              await testExpectedAlertsAreDeleted(
                expectedAlerts.map((a) => a.space1.id),
                deletedAlerts.map((a) => a.space1.id)
              );
              await cleanupEventLog();
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should delete the correct of alerts - observability active alerts', async () => {
          let scheduleResponse;
          const taskBody = {
            active_alert_delete_threshold: 90,
            inactive_alert_delete_threshold: undefined,
            category_ids: ['observability'],
          };

          switch (scenario.id) {
            case 'global_read at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'space_1_all_alerts_none_actions at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              await retry.try(async () => {
                scheduleResponse = await doSchedule(scenario, taskBody);
                expect(scheduleResponse.status).to.eql(204);
              });

              const expectedAlerts = [
                ...inactiveStackAlertsOlderThan90,
                ...inactiveStackAlertsNewerThan90,
                ...activeStackAlertsOlderThan90,
                ...activeStackAlertsNewerThan90,
                ...inactiveO11yAlertsOlderThan90,
                ...inactiveO11yAlertsNewerThan90,
                ...activeO11yAlertsNewerThan90,
                ...inactiveSecurityAlertsOlderThan90,
                ...inactiveSecurityAlertsNewerThan90,
                ...activeSecurityAlertsOlderThan90,
                ...activeSecurityAlertsNewerThan90,
              ];

              const deletedAlerts = activeO11yAlertsOlderThan90;

              await testExpectedAlertsAreDeleted(
                expectedAlerts.map((a) => a.space1.id),
                deletedAlerts.map((a) => a.space1.id)
              );
              await cleanupEventLog();
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should delete the correct of alerts - observability inactive alerts', async () => {
          let scheduleResponse;
          const taskBody = {
            active_alert_delete_threshold: undefined,
            inactive_alert_delete_threshold: 90,
            category_ids: ['observability'],
          };

          switch (scenario.id) {
            case 'global_read at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'space_1_all_alerts_none_actions at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              await retry.try(async () => {
                scheduleResponse = await doSchedule(scenario, taskBody);
                expect(scheduleResponse.status).to.eql(204);
              });

              const expectedAlerts = [
                ...inactiveStackAlertsOlderThan90,
                ...inactiveStackAlertsNewerThan90,
                ...activeStackAlertsOlderThan90,
                ...activeStackAlertsNewerThan90,
                ...inactiveO11yAlertsNewerThan90,
                ...activeO11yAlertsOlderThan90,
                ...activeO11yAlertsNewerThan90,
                ...inactiveSecurityAlertsOlderThan90,
                ...inactiveSecurityAlertsNewerThan90,
                ...activeSecurityAlertsOlderThan90,
                ...activeSecurityAlertsNewerThan90,
              ];

              const deletedAlerts = inactiveO11yAlertsOlderThan90;

              await testExpectedAlertsAreDeleted(
                expectedAlerts.map((a) => a.space1.id),
                deletedAlerts.map((a) => a.space1.id)
              );
              await cleanupEventLog();
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should delete the correct of alerts - observability active and inactive alerts', async () => {
          let scheduleResponse;
          const taskBody = {
            active_alert_delete_threshold: 90,
            inactive_alert_delete_threshold: 90,
            category_ids: ['observability'],
          };

          switch (scenario.id) {
            case 'global_read at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'space_1_all_alerts_none_actions at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              await retry.try(async () => {
                scheduleResponse = await doSchedule(scenario, taskBody);
                expect(scheduleResponse.status).to.eql(204);
              });

              const expectedAlerts = [
                ...inactiveStackAlertsOlderThan90,
                ...inactiveStackAlertsNewerThan90,
                ...activeStackAlertsOlderThan90,
                ...activeStackAlertsNewerThan90,
                ...inactiveO11yAlertsNewerThan90,
                ...activeO11yAlertsNewerThan90,
                ...inactiveSecurityAlertsOlderThan90,
                ...inactiveSecurityAlertsNewerThan90,
                ...activeSecurityAlertsOlderThan90,
                ...activeSecurityAlertsNewerThan90,
              ];

              const deletedAlerts = [
                ...inactiveO11yAlertsOlderThan90,
                ...activeO11yAlertsOlderThan90,
              ];

              await testExpectedAlertsAreDeleted(
                expectedAlerts.map((a) => a.space1.id),
                deletedAlerts.map((a) => a.space1.id)
              );
              await cleanupEventLog();
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should delete the correct of alerts - security active alerts', async () => {
          let scheduleResponse;
          const taskBody = {
            active_alert_delete_threshold: 90,
            inactive_alert_delete_threshold: undefined,
            category_ids: ['securitySolution'],
          };

          switch (scenario.id) {
            case 'global_read at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'space_1_all_alerts_none_actions at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              await retry.try(async () => {
                scheduleResponse = await doSchedule(scenario, taskBody);
                expect(scheduleResponse.status).to.eql(204);
              });

              const expectedAlerts = [
                ...inactiveStackAlertsOlderThan90,
                ...inactiveStackAlertsNewerThan90,
                ...activeStackAlertsOlderThan90,
                ...activeStackAlertsNewerThan90,
                ...inactiveO11yAlertsOlderThan90,
                ...inactiveO11yAlertsNewerThan90,
                ...activeO11yAlertsOlderThan90,
                ...activeO11yAlertsNewerThan90,
                ...inactiveSecurityAlertsOlderThan90,
                ...inactiveSecurityAlertsNewerThan90,
                ...activeSecurityAlertsNewerThan90,
              ];

              const deletedAlerts = activeSecurityAlertsOlderThan90;

              await testExpectedAlertsAreDeleted(
                expectedAlerts.map((a) => a.space1.id),
                deletedAlerts.map((a) => a.space1.id)
              );
              await cleanupEventLog();
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should delete the correct of alerts - security inactive alerts', async () => {
          let scheduleResponse;
          const taskBody = {
            active_alert_delete_threshold: undefined,
            inactive_alert_delete_threshold: 90,
            category_ids: ['securitySolution'],
          };

          switch (scenario.id) {
            case 'global_read at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'space_1_all_alerts_none_actions at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              await retry.try(async () => {
                scheduleResponse = await doSchedule(scenario, taskBody);
                expect(scheduleResponse.status).to.eql(204);
              });

              const expectedAlerts = [
                ...inactiveStackAlertsOlderThan90,
                ...inactiveStackAlertsNewerThan90,
                ...activeStackAlertsOlderThan90,
                ...activeStackAlertsNewerThan90,
                ...inactiveO11yAlertsOlderThan90,
                ...inactiveO11yAlertsNewerThan90,
                ...activeO11yAlertsOlderThan90,
                ...activeO11yAlertsNewerThan90,
                ...inactiveSecurityAlertsNewerThan90,
                ...activeSecurityAlertsOlderThan90,
                ...activeSecurityAlertsNewerThan90,
              ];

              const deletedAlerts = inactiveSecurityAlertsOlderThan90;

              await testExpectedAlertsAreDeleted(
                expectedAlerts.map((a) => a.space1.id),
                deletedAlerts.map((a) => a.space1.id)
              );
              await cleanupEventLog();
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should delete the correct of alerts - security active and inactive alerts', async () => {
          let scheduleResponse;
          const taskBody = {
            active_alert_delete_threshold: 90,
            inactive_alert_delete_threshold: 90,
            category_ids: ['securitySolution'],
          };

          switch (scenario.id) {
            case 'global_read at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'space_1_all_alerts_none_actions at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              await retry.try(async () => {
                scheduleResponse = await doSchedule(scenario, taskBody);
                expect(scheduleResponse.status).to.eql(204);
              });

              const expectedAlerts = [
                ...inactiveStackAlertsOlderThan90,
                ...inactiveStackAlertsNewerThan90,
                ...activeStackAlertsOlderThan90,
                ...activeStackAlertsNewerThan90,
                ...inactiveO11yAlertsOlderThan90,
                ...inactiveO11yAlertsNewerThan90,
                ...activeO11yAlertsOlderThan90,
                ...activeO11yAlertsNewerThan90,
                ...inactiveSecurityAlertsNewerThan90,
                ...activeSecurityAlertsNewerThan90,
              ];

              const deletedAlerts = [
                ...inactiveSecurityAlertsOlderThan90,
                ...activeSecurityAlertsOlderThan90,
              ];

              await testExpectedAlertsAreDeleted(
                expectedAlerts.map((a) => a.space1.id),
                deletedAlerts.map((a) => a.space1.id)
              );
              await cleanupEventLog();
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should delete the correct of alerts - management active alerts', async () => {
          let scheduleResponse;
          const taskBody = {
            active_alert_delete_threshold: 90,
            inactive_alert_delete_threshold: undefined,
            category_ids: ['management'],
          };

          switch (scenario.id) {
            case 'global_read at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'space_1_all_alerts_none_actions at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              await retry.try(async () => {
                scheduleResponse = await doSchedule(scenario, taskBody);
                expect(scheduleResponse.status).to.eql(204);
              });

              const expectedAlerts = [
                ...inactiveStackAlertsOlderThan90,
                ...inactiveStackAlertsNewerThan90,
                ...activeStackAlertsNewerThan90,
                ...inactiveO11yAlertsOlderThan90,
                ...inactiveO11yAlertsNewerThan90,
                ...activeO11yAlertsOlderThan90,
                ...activeO11yAlertsNewerThan90,
                ...inactiveSecurityAlertsOlderThan90,
                ...inactiveSecurityAlertsNewerThan90,
                ...activeSecurityAlertsOlderThan90,
                ...activeSecurityAlertsNewerThan90,
              ];

              const deletedAlerts = activeStackAlertsOlderThan90;

              await testExpectedAlertsAreDeleted(
                expectedAlerts.map((a) => a.space1.id),
                deletedAlerts.map((a) => a.space1.id)
              );
              await cleanupEventLog();
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should delete the correct of alerts - management inactive alerts', async () => {
          let scheduleResponse;
          const taskBody = {
            active_alert_delete_threshold: undefined,
            inactive_alert_delete_threshold: 90,
            category_ids: ['management'],
          };

          switch (scenario.id) {
            case 'global_read at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'space_1_all_alerts_none_actions at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              await retry.try(async () => {
                scheduleResponse = await doSchedule(scenario, taskBody);
                expect(scheduleResponse.status).to.eql(204);
              });

              const expectedAlerts = [
                ...inactiveStackAlertsNewerThan90,
                ...activeStackAlertsOlderThan90,
                ...activeStackAlertsNewerThan90,
                ...inactiveO11yAlertsOlderThan90,
                ...inactiveO11yAlertsNewerThan90,
                ...activeO11yAlertsOlderThan90,
                ...activeO11yAlertsNewerThan90,
                ...inactiveSecurityAlertsOlderThan90,
                ...inactiveSecurityAlertsNewerThan90,
                ...activeSecurityAlertsOlderThan90,
                ...activeSecurityAlertsNewerThan90,
              ];

              const deletedAlerts = inactiveStackAlertsOlderThan90;

              await testExpectedAlertsAreDeleted(
                expectedAlerts.map((a) => a.space1.id),
                deletedAlerts.map((a) => a.space1.id)
              );
              await cleanupEventLog();
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should delete the correct of alerts - management active and inactive alerts', async () => {
          let scheduleResponse;
          const taskBody = {
            active_alert_delete_threshold: 90,
            inactive_alert_delete_threshold: 90,
            category_ids: ['management'],
          };

          switch (scenario.id) {
            case 'global_read at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'space_1_all_alerts_none_actions at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              await retry.try(async () => {
                scheduleResponse = await doSchedule(scenario, taskBody);
                expect(scheduleResponse.status).to.eql(204);
              });

              const expectedAlerts = [
                ...inactiveStackAlertsNewerThan90,
                ...activeStackAlertsNewerThan90,
                ...inactiveO11yAlertsOlderThan90,
                ...inactiveO11yAlertsNewerThan90,
                ...activeO11yAlertsOlderThan90,
                ...activeO11yAlertsNewerThan90,
                ...inactiveSecurityAlertsOlderThan90,
                ...inactiveSecurityAlertsNewerThan90,
                ...activeSecurityAlertsOlderThan90,
                ...activeSecurityAlertsNewerThan90,
              ];

              const deletedAlerts = [
                ...inactiveStackAlertsOlderThan90,
                ...activeStackAlertsOlderThan90,
              ];

              await testExpectedAlertsAreDeleted(
                expectedAlerts.map((a) => a.space1.id),
                deletedAlerts.map((a) => a.space1.id)
              );
              await cleanupEventLog();
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should delete the correct of alerts - multi-category active alerts', async () => {
          let scheduleResponse;
          const taskBody = {
            active_alert_delete_threshold: 90,
            inactive_alert_delete_threshold: undefined,
            category_ids: ['observability', 'management'],
          };

          switch (scenario.id) {
            case 'global_read at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'space_1_all_alerts_none_actions at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              await retry.try(async () => {
                scheduleResponse = await doSchedule(scenario, taskBody);
                expect(scheduleResponse.status).to.eql(204);
              });

              const expectedAlerts = [
                ...inactiveStackAlertsOlderThan90,
                ...inactiveStackAlertsNewerThan90,
                ...activeStackAlertsNewerThan90,
                ...inactiveO11yAlertsOlderThan90,
                ...inactiveO11yAlertsNewerThan90,
                ...activeO11yAlertsNewerThan90,
                ...inactiveSecurityAlertsOlderThan90,
                ...inactiveSecurityAlertsNewerThan90,
                ...activeSecurityAlertsOlderThan90,
                ...activeSecurityAlertsNewerThan90,
              ];

              const deletedAlerts = [
                ...activeStackAlertsOlderThan90,
                ...activeO11yAlertsOlderThan90,
              ];

              await testExpectedAlertsAreDeleted(
                expectedAlerts.map((a) => a.space1.id),
                deletedAlerts.map((a) => a.space1.id)
              );
              await cleanupEventLog();
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should delete the correct of alerts - multi-category inactive alerts', async () => {
          let scheduleResponse;
          const taskBody = {
            active_alert_delete_threshold: undefined,
            inactive_alert_delete_threshold: 90,
            category_ids: ['observability', 'securitySolution'],
          };

          switch (scenario.id) {
            case 'global_read at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'space_1_all_alerts_none_actions at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              await retry.try(async () => {
                scheduleResponse = await doSchedule(scenario, taskBody);
                expect(scheduleResponse.status).to.eql(204);
              });

              const expectedAlerts = [
                ...inactiveStackAlertsOlderThan90,
                ...inactiveStackAlertsNewerThan90,
                ...activeStackAlertsOlderThan90,
                ...activeStackAlertsNewerThan90,
                ...inactiveO11yAlertsNewerThan90,
                ...activeO11yAlertsOlderThan90,
                ...activeO11yAlertsNewerThan90,
                ...inactiveSecurityAlertsNewerThan90,
                ...activeSecurityAlertsOlderThan90,
                ...activeSecurityAlertsNewerThan90,
              ];

              const deletedAlerts = [
                ...inactiveO11yAlertsOlderThan90,
                ...inactiveSecurityAlertsOlderThan90,
              ];

              await testExpectedAlertsAreDeleted(
                expectedAlerts.map((a) => a.space1.id),
                deletedAlerts.map((a) => a.space1.id)
              );
              await cleanupEventLog();
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should delete the correct of alerts - multi-category active and inactive alerts', async () => {
          let scheduleResponse;
          const taskBody = {
            active_alert_delete_threshold: 90,
            inactive_alert_delete_threshold: 90,
            category_ids: ['securitySolution', 'management'],
          };

          switch (scenario.id) {
            case 'global_read at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'space_1_all_alerts_none_actions at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              await retry.try(async () => {
                scheduleResponse = await doSchedule(scenario, taskBody);
                expect(scheduleResponse.status).to.eql(204);
              });

              const expectedAlerts = [
                ...inactiveStackAlertsNewerThan90,
                ...activeStackAlertsNewerThan90,
                ...inactiveO11yAlertsOlderThan90,
                ...inactiveO11yAlertsNewerThan90,
                ...activeO11yAlertsOlderThan90,
                ...activeO11yAlertsNewerThan90,
                ...inactiveSecurityAlertsNewerThan90,
                ...activeSecurityAlertsNewerThan90,
              ];

              const deletedAlerts = [
                ...inactiveStackAlertsOlderThan90,
                ...activeStackAlertsOlderThan90,
                ...inactiveSecurityAlertsOlderThan90,
                ...activeSecurityAlertsOlderThan90,
              ];

              await testExpectedAlertsAreDeleted(
                expectedAlerts.map((a) => a.space1.id),
                deletedAlerts.map((a) => a.space1.id)
              );
              await cleanupEventLog();
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should not delete alerts linked to a case', async () => {
          // index some additional docs with case ids
          const alert0 = getRecoveredAlert(
            '8d25ae10-77fb-4a04-a16c-150ad19de114',
            'stack',
            moment.utc().subtract(100, 'days').toISOString(),
            'space1'
          );
          const alert1 = getRecoveredAlert(
            '5e67d9e5-c5af-4720-80e8-f7bab999ae5a',
            'o11y',
            moment.utc().subtract(99, 'days').toISOString(),
            'space1'
          );
          const alert2 = getActiveAlert(
            '10979c00-9b16-4105-b2a2-7b981ef82881',
            'o11y',
            moment.utc().subtract(99, 'days').toISOString(),
            'space1'
          );
          const alert3 = getActiveAlert(
            '30cf6c43-3ab6-456d-b8b6-5c1e3df00ec1',
            'security',
            moment.utc().subtract(99, 'days').toISOString(),
            'space1'
          );
          const testAlertDocsWithCases = [
            {
              ...alert0,
              _source: {
                ...alert0._source,
                [ALERT_CASE_IDS]: ['case-id-1', 'case-id-2', 'case-id-3', 'case-id-4'],
              },
            },
            {
              ...alert1,
              _source: {
                ...alert1._source,
                [ALERT_CASE_IDS]: [],
              },
            },
            {
              ...alert2,
              _source: {
                ...alert2._source,
                [ALERT_CASE_IDS]: ['case-id-1'],
              },
            },
            {
              ...alert3,
              _source: {
                ...alert3._source,
                [ALERT_CASE_IDS]: ['abcdef'],
              },
            },
          ];
          const operations = testAlertDocsWithCases.flatMap(({ _index, _id, _source: doc }) => {
            return [{ index: { _index, _id } }, doc];
          });
          await es.bulk({ refresh: 'wait_for', operations });

          let scheduleResponse;
          const taskBody = {
            active_alert_delete_threshold: 90,
            inactive_alert_delete_threshold: 90,
            category_ids: ['management', 'observability', 'securitySolution'],
          };

          switch (scenario.id) {
            case 'global_read at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'space_1_all_alerts_none_actions at space1':
              scheduleResponse = await doSchedule(scenario, taskBody);
              expect(scheduleResponse.statusCode).to.eql(403);
              expect(scheduleResponse.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/settings/_alert_delete_schedule] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              await retry.try(async () => {
                scheduleResponse = await doSchedule(scenario, taskBody);
                expect(scheduleResponse.status).to.eql(204);
              });

              const expectedAlerts = [
                ...inactiveStackAlertsNewerThan90,
                ...activeStackAlertsNewerThan90,
                ...inactiveO11yAlertsNewerThan90,
                ...activeO11yAlertsNewerThan90,
                ...inactiveSecurityAlertsNewerThan90,
                ...activeSecurityAlertsNewerThan90,

                // all of these are older than 90 days but have attached cases
                { space1: { id: testAlertDocsWithCases[0]._id } },
                { space1: { id: testAlertDocsWithCases[2]._id } },
                { space1: { id: testAlertDocsWithCases[3]._id } },
              ];

              const deletedAlerts = [
                ...inactiveStackAlertsOlderThan90,
                ...activeStackAlertsOlderThan90,
                ...inactiveO11yAlertsOlderThan90,
                ...activeO11yAlertsOlderThan90,
                ...inactiveSecurityAlertsOlderThan90,
                ...activeSecurityAlertsOlderThan90,
                // kibana.alert.case_ids is empty so should be deleted
                { space1: { id: testAlertDocsWithCases[1]._id } },
              ];

              await testExpectedAlertsAreDeleted(
                expectedAlerts.map((a) => a.space1.id),
                deletedAlerts.map((a) => a.space1.id)
              );
              await cleanupEventLog();
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }

    describe('multi-space', () => {
      it('should delete alerts from multiple spaces when specified', async () => {
        // index docs into the default space
        const testAlertDocs = getTestAlertDocs('default');
        const operations = testAlertDocs.flatMap(({ _index, _id, _source: doc }) => {
          return [{ index: { _index, _id } }, doc];
        });
        await es.bulk({ refresh: 'wait_for', operations });

        // schedule the task
        await retry.try(async () => {
          await supertest
            .post(
              `${getUrlPrefix(Space1.id)}/internal/alerting/rules/settings/_alert_delete_schedule`
            )
            .set('kbn-xsrf', 'foo')
            .send({
              active_alert_delete_threshold: undefined,
              inactive_alert_delete_threshold: 90,
              space_ids: [Space1.id, 'default'],
              category_ids: ['management', 'observability', 'securitySolution'],
            })
            .expect(204);
        });

        const expectedAlerts = [
          ...inactiveStackAlertsNewerThan90,
          ...activeStackAlertsOlderThan90,
          ...activeStackAlertsNewerThan90,
          ...inactiveO11yAlertsNewerThan90,
          ...activeO11yAlertsOlderThan90,
          ...activeO11yAlertsNewerThan90,
          ...inactiveSecurityAlertsNewerThan90,
          ...activeSecurityAlertsOlderThan90,
          ...activeSecurityAlertsNewerThan90,
        ];

        const deletedAlerts = [
          ...inactiveStackAlertsOlderThan90,
          ...inactiveO11yAlertsOlderThan90,
          ...inactiveSecurityAlertsOlderThan90,
        ];

        const expectedAlertIds = [
          ...expectedAlerts.map((a) => a.default.id),
          ...expectedAlerts.map((a) => a.space1.id),
        ];

        // wait for the task to complete
        await retry.try(async () => {
          const results = await es.search<IValidatedEvent>({
            index: '.kibana-event-log*',
            query: { bool: { must: [{ match: { 'event.action': 'delete-alerts' } }] } },
          });
          expect(results.hits.hits.length).to.eql(2);
          expect(results.hits.hits[0]._source?.event?.outcome).to.eql('success');
          expect(results.hits.hits[1]._source?.event?.outcome).to.eql('success');

          const defaultSpaceEventLog = results.hits.hits.find(
            (hit) => hit._source?.kibana?.space_ids?.[0] === 'default'
          );
          expect(defaultSpaceEventLog).not.to.be(undefined);
          expect(defaultSpaceEventLog?._source?.kibana?.alert?.deletion?.num_deleted).to.eql(
            deletedAlerts.length
          );

          const space1SpaceEventLog = results.hits.hits.find(
            (hit) => hit._source?.kibana?.space_ids?.[0] === 'space1'
          );
          expect(space1SpaceEventLog).not.to.be(undefined);
          expect(space1SpaceEventLog?._source?.kibana?.alert?.deletion?.num_deleted).to.eql(
            deletedAlerts.length
          );
        });

        await retry.try(async () => {
          // query for alerts
          const alerts = await es.search({
            index: '.internal.alerts-*',
            size: 100,
            query: { match_all: {} },
          });
          expect(alerts.hits.hits.length).to.eql(expectedAlertIds.length);
          expectedAlertIds.forEach((alertId) => {
            expect(alerts.hits.hits.findIndex((a) => a._id === alertId)).to.be.greaterThan(-1);
          });
        });

        await cleanupEventLog();
      });
    });

    it('should throw when attempting to delete alerts in a space without permission', async () => {
      const response = await supertestWithoutAuth
        .post(`${getUrlPrefix(Space1.id)}/internal/alerting/rules/settings/_alert_delete_schedule`)
        .set('kbn-xsrf', 'foo')
        .auth(Space1AllAtSpace1.user.username, Space1AllAtSpace1.user.password)
        .send({
          active_alert_delete_threshold: undefined,
          inactive_alert_delete_threshold: 90,
          category_ids: ['management'],
          space_ids: [Space1.id, Space2.id], // no space2 privileges
        });

      expect(response.body).to.eql({
        error: 'Forbidden',
        message: `Insufficient privileges to delete alerts in the specified spaces`,
        statusCode: 403,
      });
    });
  });
}
