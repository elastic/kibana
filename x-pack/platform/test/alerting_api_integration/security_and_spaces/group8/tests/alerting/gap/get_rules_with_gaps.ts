/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../../../scenarios';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { getUrlPrefix, ObjectRemover, getTestRuleData } from '../../../../../common/lib';

export default function getRuleIdsWithGapsTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('get rules with gaps', () => {
    const objectRemover = new ObjectRemover(supertest);
    const searchStart = '2024-01-01T00:00:00.000Z';
    const searchEnd = '2024-01-31T00:00:00.000Z';
    const gap1Start = '2024-01-05T00:00:00.000Z';
    const gap1End = '2024-01-06T00:00:00.000Z';
    const gap2Start = '2024-01-15T00:00:00.000Z';
    const gap2End = '2024-01-16T00:00:00.000Z';

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    function getRule(overwrites = {}) {
      return getTestRuleData({
        rule_type_id: 'test.patternFiringAutoRecoverFalse',
        params: {
          pattern: {
            instance: [true, false, true],
          },
        },
        schedule: { interval: '12h' },
        ...overwrites,
      });
    }

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        const apiOptions = {
          spaceId: space.id,
          username: user.username,
          password: user.password,
        };

        describe(`get rules with gaps (${scenario.id})`, () => {
          beforeEach(async () => {
            await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/delete_gaps`)
              .set('kbn-xsrf', 'foo')
              .send({})
              .expect(200);
          });

          it('should return rules with gaps in given time range', async () => {
            // Create 2 rules
            const rresponse1 = await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/api/alerting/rule`)
              .set('kbn-xsrf', 'foo')
              .send(getRule())
              .expect(200);
            const ruleId1 = rresponse1.body.id;
            objectRemover.add(apiOptions.spaceId, ruleId1, 'rule', 'alerting');

            const rresponse2 = await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/api/alerting/rule`)
              .set('kbn-xsrf', 'foo')
              .send(getRule())
              .expect(200);
            const ruleId2 = rresponse2.body.id;
            objectRemover.add(apiOptions.spaceId, ruleId2, 'rule', 'alerting');

            // Create gaps for both rules
            await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/report_gap`)
              .set('kbn-xsrf', 'foo')
              .send({
                ruleId: ruleId1,
                start: gap1Start,
                end: gap1End,
                spaceId: apiOptions.spaceId,
              });

            await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/report_gap`)
              .set('kbn-xsrf', 'foo')
              .send({
                ruleId: ruleId2,
                start: gap2Start,
                end: gap2End,
                spaceId: apiOptions.spaceId,
              });

            const response = await supertestWithoutAuth
              .post(`${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/gaps/_get_rules`)
              .set('kbn-xsrf', 'foo')
              .auth(apiOptions.username, apiOptions.password)
              .send({
                start: searchStart,
                end: searchEnd,
              });

            switch (scenario.id) {
              case 'no_kibana_privileges at space1':
              case 'space_1_all at space2':
                expect(response.statusCode).to.eql(403);
                expect(response.body).to.eql({
                  error: 'Forbidden',
                  message:
                    'Failed to find rules with gaps: Unauthorized to find rules for any rule types',
                  statusCode: 403,
                });
                break;

              case 'global_read at space1':
              case 'space_1_all_alerts_none_actions at space1':
              case 'superuser at space1':
              case 'space_1_all at space1':
              case 'space_1_all_with_restricted_fixture at space1':
                expect(response.statusCode).to.eql(200);
                expect(response.body.total).to.eql(2);
                expect(response.body.rule_ids).to.have.length(2);
                expect(response.body.rule_ids).to.contain(ruleId1);
                expect(response.body.rule_ids).to.contain(ruleId2);
                break;

              default:
                throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
            }
          });

          it('should return rules ordered by oldest gap first by default', async () => {
            const rresponse1 = await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/api/alerting/rule`)
              .set('kbn-xsrf', 'foo')
              .send(getRule())
              .expect(200);
            const ruleId1 = rresponse1.body.id;
            objectRemover.add(apiOptions.spaceId, ruleId1, 'rule', 'alerting');

            const rresponse2 = await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/api/alerting/rule`)
              .set('kbn-xsrf', 'foo')
              .send(getRule())
              .expect(200);
            const ruleId2 = rresponse2.body.id;
            objectRemover.add(apiOptions.spaceId, ruleId2, 'rule', 'alerting');

            await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/report_gap`)
              .set('kbn-xsrf', 'foo')
              .send({
                ruleId: ruleId1,
                start: gap1Start,
                end: gap1End,
                spaceId: apiOptions.spaceId,
              });
            // Additional gap for rule 1 (later than first)
            await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/report_gap`)
              .set('kbn-xsrf', 'foo')
              .send({
                ruleId: ruleId1,
                start: '2024-01-08T00:00:00.000Z',
                end: '2024-01-09T00:00:00.000Z',
                spaceId: apiOptions.spaceId,
              });

            await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/report_gap`)
              .set('kbn-xsrf', 'foo')
              .send({
                ruleId: ruleId2,
                start: gap2Start,
                end: gap2End,
                spaceId: apiOptions.spaceId,
              });
            // Additional gap for rule 2 (later than first)
            await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/report_gap`)
              .set('kbn-xsrf', 'foo')
              .send({
                ruleId: ruleId2,
                start: '2024-01-18T00:00:00.000Z',
                end: '2024-01-19T00:00:00.000Z',
                spaceId: apiOptions.spaceId,
              });

            const response = await supertestWithoutAuth
              .post(`${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/gaps/_get_rules`)
              .set('kbn-xsrf', 'foo')
              .auth(apiOptions.username, apiOptions.password)
              .send({ start: searchStart, end: searchEnd });

            switch (scenario.id) {
              case 'global_read at space1':
              case 'space_1_all_alerts_none_actions at space1':
              case 'superuser at space1':
              case 'space_1_all at space1':
              case 'space_1_all_with_restricted_fixture at space1':
                expect(response.statusCode).to.eql(200);
                expect(response.body.rule_ids).to.eql([ruleId1, ruleId2]);
                break;
              case 'no_kibana_privileges at space1':
              case 'space_1_all at space2':
                expect(response.statusCode).to.eql(403);
                break;
              default:
                throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
            }
          });

          it('should return rules ordered by newest gap first when sort_order is desc', async () => {
            const rresponse1 = await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/api/alerting/rule`)
              .set('kbn-xsrf', 'foo')
              .send(getRule())
              .expect(200);
            const ruleId1 = rresponse1.body.id;
            objectRemover.add(apiOptions.spaceId, ruleId1, 'rule', 'alerting');

            const rresponse2 = await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/api/alerting/rule`)
              .set('kbn-xsrf', 'foo')
              .send(getRule())
              .expect(200);
            const ruleId2 = rresponse2.body.id;
            objectRemover.add(apiOptions.spaceId, ruleId2, 'rule', 'alerting');

            await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/report_gap`)
              .set('kbn-xsrf', 'foo')
              .send({
                ruleId: ruleId1,
                start: gap1Start,
                end: gap1End,
                spaceId: apiOptions.spaceId,
              });
            // Additional gap for rule 1 (later than first)
            await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/report_gap`)
              .set('kbn-xsrf', 'foo')
              .send({
                ruleId: ruleId1,
                start: '2024-01-08T00:00:00.000Z',
                end: '2024-01-09T00:00:00.000Z',
                spaceId: apiOptions.spaceId,
              });

            await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/report_gap`)
              .set('kbn-xsrf', 'foo')
              .send({
                ruleId: ruleId2,
                start: gap2Start,
                end: gap2End,
                spaceId: apiOptions.spaceId,
              });
            // Additional gap for rule 2 (later than first)
            await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/report_gap`)
              .set('kbn-xsrf', 'foo')
              .send({
                ruleId: ruleId2,
                start: '2024-01-18T00:00:00.000Z',
                end: '2024-01-19T00:00:00.000Z',
                spaceId: apiOptions.spaceId,
              });

            const response = await supertestWithoutAuth
              .post(`${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/gaps/_get_rules`)
              .set('kbn-xsrf', 'foo')
              .auth(apiOptions.username, apiOptions.password)
              .send({ start: searchStart, end: searchEnd, sort_order: 'desc' });

            switch (scenario.id) {
              case 'global_read at space1':
              case 'space_1_all_alerts_none_actions at space1':
              case 'superuser at space1':
              case 'space_1_all at space1':
              case 'space_1_all_with_restricted_fixture at space1':
                expect(response.statusCode).to.eql(200);
                expect(response.body.rule_ids).to.eql([ruleId2, ruleId1]);
                break;
              case 'no_kibana_privileges at space1':
              case 'space_1_all at space2':
                expect(response.statusCode).to.eql(403);
                break;
              default:
                throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
            }
          });

          it('should filter rules by unfilled gap status', async () => {
            const ruleResponse = await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/api/alerting/rule`)
              .set('kbn-xsrf', 'foo')
              .send(getRule())
              .expect(200);
            const ruleId = ruleResponse.body.id;
            objectRemover.add(apiOptions.spaceId, ruleId, 'rule', 'alerting');

            await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/report_gap`)
              .set('kbn-xsrf', 'foo')
              .send({
                ruleId,
                start: gap1Start,
                end: gap1End,
                spaceId: apiOptions.spaceId,
              });

            const response = await supertestWithoutAuth
              .post(`${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/gaps/_get_rules`)
              .set('kbn-xsrf', 'foo')
              .auth(apiOptions.username, apiOptions.password)
              .send({
                start: searchStart,
                end: searchEnd,
                statuses: ['unfilled'],
              });

            switch (scenario.id) {
              case 'no_kibana_privileges at space1':
              case 'space_1_all at space2':
                expect(response.statusCode).to.eql(403);
                break;

              case 'global_read at space1':
              case 'space_1_all_alerts_none_actions at space1':
              case 'superuser at space1':
              case 'space_1_all at space1':
              case 'space_1_all_with_restricted_fixture at space1':
                expect(response.statusCode).to.eql(200);
                expect(response.body.total).to.eql(1);
                expect(response.body.rule_ids).to.eql([ruleId]);
                break;

              default:
                throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
            }
          });

          it('should return empty result when filtering by filled gap status', async () => {
            const ruleResponse = await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/api/alerting/rule`)
              .set('kbn-xsrf', 'foo')
              .send(getRule())
              .expect(200);
            const ruleId = ruleResponse.body.id;
            objectRemover.add(apiOptions.spaceId, ruleId, 'rule', 'alerting');

            await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/report_gap`)
              .set('kbn-xsrf', 'foo')
              .send({
                ruleId,
                start: gap1Start,
                end: gap1End,
                spaceId: apiOptions.spaceId,
              });

            const response = await supertestWithoutAuth
              .post(`${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/gaps/_get_rules`)
              .set('kbn-xsrf', 'foo')
              .auth(apiOptions.username, apiOptions.password)
              .send({
                start: searchStart,
                end: searchEnd,
                statuses: ['filled'],
              });

            switch (scenario.id) {
              case 'no_kibana_privileges at space1':
              case 'space_1_all at space2':
                expect(response.statusCode).to.eql(403);
                break;

              case 'global_read at space1':
              case 'space_1_all_alerts_none_actions at space1':
              case 'superuser at space1':
              case 'space_1_all at space1':
              case 'space_1_all_with_restricted_fixture at space1':
                expect(response.statusCode).to.eql(200);
                expect(response.body.total).to.eql(0);
                expect(response.body.rule_ids).to.eql([]);
                break;

              default:
                throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
            }
          });

          it('should filter rules by aggregated unfilled status', async () => {
            const ruleResponse = await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/api/alerting/rule`)
              .set('kbn-xsrf', 'foo')
              .send(getRule())
              .expect(200);
            const ruleId = ruleResponse.body.id;
            objectRemover.add(apiOptions.spaceId, ruleId, 'rule', 'alerting');

            await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/report_gap`)
              .set('kbn-xsrf', 'foo')
              .send({
                ruleId,
                start: gap1Start,
                end: gap1End,
                spaceId: apiOptions.spaceId,
              });

            const response = await supertestWithoutAuth
              .post(`${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/gaps/_get_rules`)
              .set('kbn-xsrf', 'foo')
              .auth(apiOptions.username, apiOptions.password)
              .send({
                start: searchStart,
                end: searchEnd,
                highest_priority_gap_fill_statuses: ['unfilled'],
              });

            switch (scenario.id) {
              case 'no_kibana_privileges at space1':
              case 'space_1_all at space2':
                expect(response.statusCode).to.eql(403);
                break;

              case 'global_read at space1':
              case 'space_1_all_alerts_none_actions at space1':
              case 'superuser at space1':
              case 'space_1_all at space1':
              case 'space_1_all_with_restricted_fixture at space1':
                expect(response.statusCode).to.eql(200);
                expect(response.body.total).to.eql(1);
                expect(response.body.rule_ids).to.eql([ruleId]);
                break;

              default:
                throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
            }
          });

          it('should return empty result when filtering by aggregated filled status', async () => {
            const ruleResponse = await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/api/alerting/rule`)
              .set('kbn-xsrf', 'foo')
              .send(getRule())
              .expect(200);
            const ruleId = ruleResponse.body.id;
            objectRemover.add(apiOptions.spaceId, ruleId, 'rule', 'alerting');

            await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/report_gap`)
              .set('kbn-xsrf', 'foo')
              .send({
                ruleId,
                start: gap1Start,
                end: gap1End,
                spaceId: apiOptions.spaceId,
              });

            const response = await supertestWithoutAuth
              .post(`${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/gaps/_get_rules`)
              .set('kbn-xsrf', 'foo')
              .auth(apiOptions.username, apiOptions.password)
              .send({
                start: searchStart,
                end: searchEnd,
                highest_priority_gap_fill_statuses: ['filled'],
              });

            switch (scenario.id) {
              case 'no_kibana_privileges at space1':
              case 'space_1_all at space2':
                expect(response.statusCode).to.eql(403);
                break;

              case 'global_read at space1':
              case 'space_1_all_alerts_none_actions at space1':
              case 'superuser at space1':
              case 'space_1_all at space1':
              case 'space_1_all_with_restricted_fixture at space1':
                expect(response.statusCode).to.eql(200);
                expect(response.body.total).to.eql(0);
                expect(response.body.rule_ids).to.eql([]);
                break;

              default:
                throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
            }
          });
        });
      });
    }
  });
}
