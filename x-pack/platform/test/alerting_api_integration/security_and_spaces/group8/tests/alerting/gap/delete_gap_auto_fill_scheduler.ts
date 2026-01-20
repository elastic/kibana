/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import moment from 'moment';
import { UserAtSpaceScenarios } from '../../../../scenarios';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { getUrlPrefix, ObjectRemover, getTestRuleData } from '../../../../../common/lib';
import { getFindGaps } from './utils';

export default function deleteGapAutoFillSchedulerTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const logger = getService('log');
  const retry = getService('retry');

  describe('gap auto fill scheduler - delete and cleanup backfills', () => {
    const objectRemover = new ObjectRemover(supertest);
    const findGaps = getFindGaps({ supertest, logger });

    function getRule(overwrites: Record<string, unknown> = {}) {
      return getTestRuleData({
        rule_type_id: 'test.patternFiringAutoRecoverFalse',
        params: {
          pattern: {
            instance: [true, false, true],
          },
        },
        schedule: { interval: '6h' },
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

        afterEach(async () => {
          await objectRemover.removeAll();
          await supertest
            .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/gap_auto_fill_scheduler/_delete_all`)
            .set('kbn-xsrf', 'foo')
            .send({});
        });

        it('deletes scheduler and removes system backfills (authorized scenarios)', async () => {
          if (
            ![
              'superuser at space1',
              'space_1_all at space1',
              'space_1_all_alerts_none_actions at space1',
              'space_1_all_with_restricted_fixture at space1',
            ].includes(scenario.id)
          ) {
            // Crearte a scheduler by superuser and delete it by unauthorized user
            const createSchedulerResp = await supertest
              .post(
                `${getUrlPrefix(
                  apiOptions.spaceId
                )}/internal/alerting/rules/gaps/auto_fill_scheduler`
              )
              .set('kbn-xsrf', 'foo')
              .auth(apiOptions.username, apiOptions.password)
              .send({
                name: 'gap-scheduler',
                rule_types: [
                  { type: 'test.patternFiringAutoRecoverFalse', consumer: 'alertsFixture' },
                ],
                scope: ['test-scope'],
                max_backfills: 1000,
                num_retries: 1,
                gap_fill_range: 'now-60d',
                enabled: true,
                schedule: { interval: '1m' },
              });

            const schedulerId = createSchedulerResp.body.id;
            // For unauthorized scenarios, ensure 403 on delete
            const resp = await supertestWithoutAuth
              .delete(
                `${getUrlPrefix(
                  apiOptions.spaceId
                )}/internal/alerting/rules/gaps/auto_fill_scheduler/${schedulerId}`
              )
              .set('kbn-xsrf', 'foo')
              .auth(apiOptions.username, apiOptions.password);

            expect(resp.statusCode).to.eql(403);
            return;
          }

          // Create a rule
          const ruleResp = await supertest
            .post(`${getUrlPrefix(apiOptions.spaceId)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getRule())
            .expect(200);
          const ruleId = ruleResp.body.id;
          objectRemover.add(apiOptions.spaceId, ruleId, 'rule', 'alerting');

          // Report a very long gap (60 days) to generate a large schedule in a system backfill
          const gapStart = moment().subtract(60, 'days').startOf('day').toISOString();
          const gapEnd = moment().subtract(1, 'day').startOf('day').toISOString();
          await supertest
            .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/report_gap`)
            .set('kbn-xsrf', 'foo')
            .send({
              ruleId,
              start: gapStart,
              end: gapEnd,
              spaceId: apiOptions.spaceId,
            })
            .expect(200);

          // Create the scheduler
          const createSchedulerResp = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/gaps/auto_fill_scheduler`
            )
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password)
            .send({
              name: `it-delete-scheduler-${Date.now()}`,
              schedule: { interval: '1m' },
              gap_fill_range: 'now-60d',
              max_backfills: 1000,
              num_retries: 1,
              scope: ['test-scope'],
              rule_types: [
                { type: 'test.patternFiringAutoRecoverFalse', consumer: 'alertsFixture' },
              ],
            });
          expect(createSchedulerResp.statusCode).to.eql(200);
          const schedulerId = createSchedulerResp.body.id;
          expect(typeof schedulerId).to.be('string');

          // Verify that at least one system backfill exists and has a large schedule
          await retry.try(async () => {
            const resp = await supertestWithoutAuth
              .post(`${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/backfill/_find`)
              .set('kbn-xsrf', 'foo')
              .auth(apiOptions.username, apiOptions.password)
              .query({
                rule_ids: ruleId,
                page: 1,
                per_page: 100,
                initiator: 'system',
              });
            expect(resp.statusCode).to.eql(200);
            const data = resp.body?.data ?? [];
            expect(Array.isArray(data)).to.be(true);
            expect(data.length > 0).to.be(true);
            const schedules = data[0]?.schedule ?? [];
            expect(schedules.length >= 10).to.be(true);
          });

          // Verify that in_progress intervals are present
          await retry.try(async () => {
            await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/event_log/refresh`)
              .set('kbn-xsrf', 'foo')
              .send({});
            const gapsResp = await findGaps({
              ruleId,
              start: gapStart,
              end: gapEnd,
              spaceId: apiOptions.spaceId,
            });
            expect(gapsResp.statusCode).to.eql(200);
            expect(gapsResp.body.total).to.eql(1);
            const gap = gapsResp.body.data[0];
            expect(gap.in_progress_intervals.length > 0).to.be(true);
          });

          // Delete the scheduler
          const deleteResp = await supertestWithoutAuth
            .delete(
              `${getUrlPrefix(
                apiOptions.spaceId
              )}/internal/alerting/rules/gaps/auto_fill_scheduler/${schedulerId}`
            )
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password);
          expect(deleteResp.statusCode).to.eql(204);

          // Verify backfills are removed
          await retry.try(async () => {
            const resp = await supertestWithoutAuth
              .post(`${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/backfill/_find`)
              .set('kbn-xsrf', 'foo')
              .auth(apiOptions.username, apiOptions.password)
              .query({
                rule_ids: ruleId,
                page: 1,
                per_page: 100,
                initiator: 'system',
              });
            expect(resp.statusCode).to.eql(200);
            const total = resp.body?.total ?? 0;
            expect(total).to.eql(0);
          });

          // After deletion, gaps should be unfilled again
          await retry.try(async () => {
            await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/event_log/refresh`)
              .set('kbn-xsrf', 'foo')
              .send({});
            const gapsResp = await findGaps({
              ruleId,
              start: gapStart,
              end: gapEnd,
              spaceId: apiOptions.spaceId,
            });
            expect(gapsResp.statusCode).to.eql(200);
            expect(gapsResp.body.total).to.eql(1);
            const gap = gapsResp.body.data[0];
            expect(['partially_filled', 'unfilled']).to.contain(gap.status);

            expect(gap.in_progress_intervals.length).to.eql(0);
          });
        });
      });
    }
  });
}
