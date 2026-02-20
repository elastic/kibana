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
import { getFindGaps } from '../../../../rule_gaps_utils';

export default function updateGapAutoFillSchedulerTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const logger = getService('log');
  const retry = getService('retry');
  const findGaps = getFindGaps({ supertest, logger });

  describe('gap auto fill scheduler - update', () => {
    const objectRemover = new ObjectRemover(supertest);
    const gapStart = moment().subtract(30, 'days').startOf('day').toISOString();
    const gapEnd = moment().subtract(1, 'day').startOf('day').toISOString();

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

        it('updates scheduler attributes when authorized', async () => {
          const url = `${getUrlPrefix(
            apiOptions.spaceId
          )}/internal/alerting/rules/gaps/auto_fill_scheduler`;

          const schedulerBody = {
            name: `update-scheduler-${Date.now()}`,
            schedule: { interval: '1m' },
            gap_fill_range: 'now-90d',
            max_backfills: 100,
            num_retries: 1,
            scope: ['test-scope'],
            rule_types: [{ type: 'test.patternFiringAutoRecoverFalse', consumer: 'alertsFixture' }],
          };

          const createResp = await supertestWithoutAuth
            .post(url)
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password)
            .send(schedulerBody);

          if (
            ![
              'superuser at space1',
              'space_1_all at space1',
              'space_1_all_alerts_none_actions at space1',
              'space_1_all_with_restricted_fixture at space1',
            ].includes(scenario.id)
          ) {
            expect(createResp.statusCode).to.eql(403);
            return;
          }

          expect(createResp.statusCode).to.eql(200);
          const schedulerId = createResp.body.id ?? createResp.body?.body?.id;
          expect(typeof schedulerId).to.be('string');

          const updateResp = await supertestWithoutAuth
            .put(`${url}/${schedulerId}`)
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password)
            .send({
              name: `${schedulerBody.name}-updated`,
              enabled: true,
              schedule: { interval: '5m' },
              gap_fill_range: 'now-45d',
              max_backfills: 250,
              num_retries: 3,
              scope: ['test-scope'],
              rule_types: schedulerBody.rule_types,
            });

          expect(updateResp.statusCode).to.eql(200);
          expect(updateResp.body.name ?? updateResp.body?.body?.name).to.eql(
            `${schedulerBody.name}-updated`
          );
        });

        it('disables scheduler and removes system backfills synchronously', async () => {
          if (
            ![
              'superuser at space1',
              'space_1_all at space1',
              'space_1_all_alerts_none_actions at space1',
              'space_1_all_with_restricted_fixture at space1',
            ].includes(scenario.id)
          ) {
            // Create scheduler as authorized user in order to ensure 403 for others
            const createResp = await supertestWithoutAuth
              .post(
                `${getUrlPrefix(
                  apiOptions.spaceId
                )}/internal/alerting/rules/gaps/auto_fill_scheduler`
              )
              .set('kbn-xsrf', 'foo')
              .auth(apiOptions.username, apiOptions.password)
              .send({
                name: 'should-fail',
                schedule: { interval: '1h' },
                gap_fill_range: 'now-60d',
                max_backfills: 100,
                num_retries: 1,
                scope: ['test-scope'],
                rule_types: [
                  { type: 'test.patternFiringAutoRecoverFalse', consumer: 'alertsFixture' },
                ],
              });
            expect(createResp.statusCode).to.eql(403);
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

          // Report a gap
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
          const schedulerBody = {
            name: `disable-update-${Date.now()}`,
            schedule: { interval: '1m' },
            gap_fill_range: 'now-60d',
            max_backfills: 1000,
            num_retries: 1,
            scope: ['test-scope'],
            rule_types: [{ type: 'test.patternFiringAutoRecoverFalse', consumer: 'alertsFixture' }],
          };

          const createResp = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/gaps/auto_fill_scheduler`
            )
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password)
            .send(schedulerBody)
            .expect(200);

          const schedulerId = createResp.body.id ?? createResp.body?.body?.id;
          expect(typeof schedulerId).to.be('string');

          // Wait for a system backfill to appear
          let capturedBackfillIds: string[] = [];
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
            capturedBackfillIds = data.map((d: any) => d.id).filter(Boolean);
          });
          expect(capturedBackfillIds.length > 0).to.be(true);

          // Put to disable the scheduler
          const putResp = await supertestWithoutAuth
            .put(
              `${getUrlPrefix(
                apiOptions.spaceId
              )}/internal/alerting/rules/gaps/auto_fill_scheduler/${schedulerId}`
            )
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password)
            .send({
              enabled: false,
              name: schedulerBody.name,
              schedule: schedulerBody.schedule,
              gap_fill_range: schedulerBody.gap_fill_range,
              max_backfills: schedulerBody.max_backfills,
              num_retries: schedulerBody.num_retries,
              rule_types: schedulerBody.rule_types,
              scope: schedulerBody.scope,
            })
            .expect(200);

          expect(putResp.body.enabled ?? putResp.body?.body?.enabled).to.be(false);

          // Ensure system backfills are removed
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
            expect(data.length).to.eql(0);
          });

          // Verify gaps no longer have in-progress intervals
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
            const gap = gapsResp.body.data[0];
            expect(gap?.in_progress_intervals?.length ?? 0).to.eql(0);
          });
        });
      });
    }
  });
}
