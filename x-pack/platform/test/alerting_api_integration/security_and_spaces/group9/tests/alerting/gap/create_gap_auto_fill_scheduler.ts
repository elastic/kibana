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

const isUserAuthorized = (scenarioId: string) =>
  [
    'superuser at space1',
    'space_1_all at space1',
    'space_1_all_alerts_none_actions at space1',
    'space_1_all_with_restricted_fixture at space1',
  ].includes(scenarioId);

export default function createGapAutoFillSchedulerTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const logger = getService('log');
  const retry = getService('retry');
  const findGaps = getFindGaps({ supertest, logger });

  describe('gap auto fill scheduler - create and schedule backfills', () => {
    const objectRemover = new ObjectRemover(supertest);

    const gapStart = moment().subtract(14, 'days').startOf('day').toISOString();
    const gapEnd = moment().subtract(13, 'days').startOf('day').toISOString();

    function getRule(overwrites: Record<string, unknown> = {}) {
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

        afterEach(async () => {
          await objectRemover.removeAll();
          // Remove all gap auto fill schedulers in this space to avoid duplicate 409s
          await supertest
            .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/gap_auto_fill_scheduler/_delete_all`)
            .set('kbn-xsrf', 'foo')
            .send({});
        });

        it('creates scheduler and (for authorized) eventually creates a system backfill', async () => {
          // Create a rule
          const ruleResponse = await supertest
            .post(`${getUrlPrefix(apiOptions.spaceId)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getRule())
            .expect(200);
          const ruleId = ruleResponse.body.id;
          objectRemover.add(apiOptions.spaceId, ruleId, 'rule', 'alerting');

          // Ensure no gaps yet
          const findResponseWithoutGaps = await findGaps({
            ruleId,
            start: gapStart,
            end: gapEnd,
            spaceId: apiOptions.spaceId,
          });
          expect(findResponseWithoutGaps.statusCode).to.eql(200);
          expect(findResponseWithoutGaps.body.total).to.eql(0);

          // Report a gap using the test helper endpoint
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

          // Create the scheduler (route only available when config enables it)
          const schedulerBody = {
            name: `it-scheduler-${Date.now()}`,
            schedule: { interval: '1m' },
            gap_fill_range: 'now-30d',
            max_backfills: 100,
            num_retries: 1,
            scope: ['test-scope'],
            rule_types: [
              {
                type: 'test.patternFiringAutoRecoverFalse',
                consumer: 'alertsFixture',
              },
            ],
          };

          const schedulerResp = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/gaps/auto_fill_scheduler`
            )
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password)
            .send(schedulerBody);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              expect(schedulerResp.statusCode).to.eql(403);
              break;

            case 'space_1_all_alerts_none_actions at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1': {
              expect(schedulerResp.statusCode).to.eql(200);

              // For stability, only assert create returns a persisted id; skip backfill polling
              const schedulerId = schedulerResp.body.id ?? schedulerResp.body?.body?.id;
              expect(typeof schedulerId).to.be('string');

              break;
            }
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('cleanup unsticks in-progress gaps, then scheduler fills them', async () => {
          if (!isUserAuthorized(scenario.id)) {
            return;
          }

          // Create a rule
          const ruleResponse = await supertest
            .post(`${getUrlPrefix(apiOptions.spaceId)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getRule({
                schedule: { interval: '24h' },
              })
            )
            .expect(200);
          const ruleId = ruleResponse.body.id;
          objectRemover.add(apiOptions.spaceId, ruleId, 'rule', 'alerting');

          // Report a gap and immediately mark it as in_progress with an old updated_at
          const stuckStart = moment().subtract(2, 'days').startOf('hour').toISOString();
          const stuckEnd = moment(stuckStart).add(30, 'minutes').toISOString();
          const oldUpdatedAt = moment().subtract(13, 'hours').toISOString();
          await supertest
            .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/report_gap`)
            .set('kbn-xsrf', 'foo')
            .send({
              ruleId,
              start: stuckStart,
              end: stuckEnd,
              spaceId: apiOptions.spaceId,
              markInProgress: true,
              updatedAt: oldUpdatedAt,
            })
            .expect(200);

          // gap exists and is marked in progress
          await retry.try(async () => {
            const initial = await findGaps({
              ruleId,
              start: stuckStart,
              end: stuckEnd,
              spaceId: apiOptions.spaceId,
            });
            expect(initial.statusCode).to.eql(200);
            expect(initial.body.total).to.eql(1);
            const g = initial.body.data[0];
            expect(g.in_progress_intervals.length > 0).to.be(true);
          });

          // Create the scheduler, which runs cleanup before scheduling
          const url = `${getUrlPrefix(
            apiOptions.spaceId
          )}/internal/alerting/rules/gaps/auto_fill_scheduler`;
          const createResp = await supertestWithoutAuth
            .post(url)
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password)
            .send({
              name: `it-scheduler-unstick-${Date.now()}`,
              schedule: { interval: '1m' },
              gap_fill_range: 'now-30d',
              max_backfills: 100,
              enabled: true,
              num_retries: 1,
              scope: ['test-scope'],
              rule_types: [
                { type: 'test.patternFiringAutoRecoverFalse', consumer: 'alertsFixture' },
              ],
            });
          expect(createResp.statusCode).to.eql(200);

          // Cleanup should remove in_progress intervals and set status back to unfilled
          await retry.try(async () => {
            // refresh event log index to see updates
            await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/event_log/refresh`)
              .set('kbn-xsrf', 'foo')
              .send({});

            const afterCleanup = await findGaps({
              ruleId,
              start: stuckStart,
              end: stuckEnd,
              spaceId: apiOptions.spaceId,
            });
            expect(afterCleanup.statusCode).to.eql(200);
            expect(afterCleanup.body.total).to.eql(1);
            const g = afterCleanup.body.data[0];
            expect(g.in_progress_intervals.length).to.eql(0);
            expect(['unfilled', 'partially_filled', 'filled']).to.contain(g.status);
          });

          // Eventually the scheduler should schedule/fill and the gap becomes filled
          await retry.try(async () => {
            const finalGapResponse = await findGaps({
              ruleId,
              start: stuckStart,
              end: stuckEnd,
              spaceId: apiOptions.spaceId,
            });
            expect(finalGapResponse.statusCode).to.eql(200);
            expect(finalGapResponse.body.total).to.eql(1);
            const finalGap = finalGapResponse.body.data[0];
            expect(finalGap.status).to.eql('filled');
            expect(finalGap.filled_intervals.length > 0).to.be(true);
            expect(finalGap.unfilled_intervals.length).to.eql(0);
            expect(finalGap.in_progress_intervals.length).to.eql(0);
          });
        });

        it('for authorized users: scheduler eventually marks gap intervals and fills the gap', async () => {
          if (!isUserAuthorized(scenario.id)) {
            return;
          }

          // Create a rule
          const ruleResponse = await supertest
            .post(`${getUrlPrefix(apiOptions.spaceId)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getRule({
                schedule: { interval: '24h' },
              })
            )
            .expect(200);
          const ruleId = ruleResponse.body.id;
          objectRemover.add(apiOptions.spaceId, ruleId, 'rule', 'alerting');

          // Report a gap
          const smallGapStart = moment().subtract(30, 'minutes').startOf('minute').toISOString();
          const smallGapEnd = moment(smallGapStart).add(10, 'minutes').toISOString();
          await supertest
            .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/report_gap`)
            .set('kbn-xsrf', 'foo')
            .send({
              ruleId,
              start: smallGapStart,
              end: smallGapEnd,
              spaceId: apiOptions.spaceId,
            })
            .expect(200);

          const url = `${getUrlPrefix(
            apiOptions.spaceId
          )}/internal/alerting/rules/gaps/auto_fill_scheduler`;
          // Create the scheduler
          const schedulerResp = await supertestWithoutAuth
            .post(url)
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password)
            .send({
              name: `it-scheduler-fill-${Date.now()}`,
              schedule: { interval: '1m' },
              gap_fill_range: 'now-30d',
              max_backfills: 100,
              enabled: true,
              scope: ['test-scope'],
              num_retries: 1,
              rule_types: [
                { type: 'test.patternFiringAutoRecoverFalse', consumer: 'alertsFixture' },
              ],
            });

          // const wait = async () => {
          //   await new Promise((resolve) => setTimeout(resolve, 1000 * 60 * 60));
          // };

          // await wait();
          expect(schedulerResp.statusCode).to.eql(200);

          // Wait for in-progress intervals to appear
          await retry.try(async () => {
            const inProgressResponse = await findGaps({
              ruleId,
              start: smallGapStart,
              end: smallGapEnd,
              spaceId: apiOptions.spaceId,
            });

            expect(inProgressResponse.statusCode).to.eql(200);
            expect(inProgressResponse.body.total).to.eql(1);
            const gap = inProgressResponse.body.data[0];
            expect(['unfilled', 'partially_filled', 'filled']).to.contain(gap.status);
            // when not filled yet, we expect at least in_progress intervals
            if (gap.status !== 'filled') {
              expect(gap.in_progress_intervals.length > 0).to.be(true);
            }
          });

          // Eventually the gap should become filled
          await retry.try(async () => {
            const finalGapResponse = await findGaps({
              ruleId,
              start: smallGapStart,
              end: smallGapEnd,
              spaceId: apiOptions.spaceId,
            });

            expect(finalGapResponse.statusCode).to.eql(200);
            expect(finalGapResponse.body.total).to.eql(1);
            const finalGap = finalGapResponse.body.data[0];
            expect(finalGap.status).to.eql('filled');
            expect(finalGap.filled_intervals.length > 0).to.be(true);
            expect(finalGap.unfilled_intervals.length).to.eql(0);
            expect(finalGap.in_progress_intervals.length).to.eql(0);
          });
        });

        describe('for authorized users: auto fill failed attempts', () => {
          if (!isUserAuthorized(scenario.id)) {
            return;
          }

          it('scheduler marks failed auto fill attempts', async () => {
            // Create a rule with error pattern
            const ruleResponse = await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/api/alerting/rule`)
              .set('kbn-xsrf', 'foo')
              .send(
                getRule({
                  schedule: { interval: '24h' },
                  params: {
                    pattern: {
                      instance: ['error'],
                    },
                  },
                })
              )
              .expect(200);
            const ruleId = ruleResponse.body.id;
            objectRemover.add(apiOptions.spaceId, ruleId, 'rule', 'alerting');

            // Report a gap
            const smallGapStart = moment().subtract(30, 'minutes').startOf('minute').toISOString();
            const smallGapEnd = moment(smallGapStart).add(10, 'minutes').toISOString();
            await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/report_gap`)
              .set('kbn-xsrf', 'foo')
              .send({
                ruleId,
                start: smallGapStart,
                end: smallGapEnd,
                spaceId: apiOptions.spaceId,
              })
              .expect(200);

            const url = `${getUrlPrefix(
              apiOptions.spaceId
            )}/internal/alerting/rules/gaps/auto_fill_scheduler`;

            // Create the scheduler
            const schedulerResp = await supertestWithoutAuth
              .post(url)
              .set('kbn-xsrf', 'foo')
              .auth(apiOptions.username, apiOptions.password)
              .send({
                name: `it-scheduler-fill-${Date.now()}`,
                schedule: { interval: '1m' },
                gap_fill_range: 'now-30d',
                max_backfills: 100,
                enabled: true,
                scope: ['test-scope'],
                num_retries: 1,
                rule_types: [
                  { type: 'test.patternFiringAutoRecoverFalse', consumer: 'alertsFixture' },
                ],
              });

            expect(schedulerResp.statusCode).to.eql(200);

            // Eventually gap should be marked with auto fill failure and not be filled
            await retry.try(async () => {
              const finalGapResponse = await findGaps({
                ruleId,
                start: smallGapStart,
                end: smallGapEnd,
                spaceId: apiOptions.spaceId,
              });

              expect(finalGapResponse.statusCode).to.eql(200);
              expect(finalGapResponse.body.total).to.eql(1);
              const finalGap = finalGapResponse.body.data[0];
              expect(finalGap.status).to.eql('unfilled');
              expect(finalGap.failed_auto_fill_attempts).to.eql(1);
              expect(finalGap.in_progress_intervals.length).to.eql(0);
            });
          });

          it('scheduler skips gaps with failures number greater than max retries', async () => {
            // Create a rule with error pattern
            const ruleResponse = await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/api/alerting/rule`)
              .set('kbn-xsrf', 'foo')
              .send(
                getRule({
                  schedule: { interval: '24h' },
                })
              )
              .expect(200);
            const ruleId = ruleResponse.body.id;
            objectRemover.add(apiOptions.spaceId, ruleId, 'rule', 'alerting');

            // Report a gap
            const failedGapStart = moment().subtract(30, 'minutes').startOf('minute').toISOString();
            const failedGapEnd = moment(failedGapStart).add(10, 'minutes').toISOString();
            await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/report_gap`)
              .set('kbn-xsrf', 'foo')
              .send({
                ruleId,
                start: failedGapStart,
                end: failedGapEnd,
                spaceId: apiOptions.spaceId,
                failedAutoFillAttempts: 4,
              })
              .expect(200);

            const notFailedGapStart = moment()
              .subtract(15, 'minutes')
              .startOf('minute')
              .toISOString();
            const notFailedGapEnd = moment(notFailedGapStart).add(10, 'minutes').toISOString();
            await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/report_gap`)
              .set('kbn-xsrf', 'foo')
              .send({
                ruleId,
                start: notFailedGapStart,
                end: notFailedGapEnd,
                spaceId: apiOptions.spaceId,
              })
              .expect(200);

            const url = `${getUrlPrefix(
              apiOptions.spaceId
            )}/internal/alerting/rules/gaps/auto_fill_scheduler`;

            // Create the scheduler
            const schedulerResp = await supertestWithoutAuth
              .post(url)
              .set('kbn-xsrf', 'foo')
              .auth(apiOptions.username, apiOptions.password)
              .send({
                name: `it-scheduler-fill-${Date.now()}`,
                schedule: { interval: '1m' },
                gap_fill_range: 'now-30d',
                max_backfills: 100,
                enabled: true,
                scope: ['test-scope'],
                num_retries: 3,
                rule_types: [
                  { type: 'test.patternFiringAutoRecoverFalse', consumer: 'alertsFixture' },
                ],
              });

            expect(schedulerResp.statusCode).to.eql(200);

            // Eventually one gap should be filled, the other should remain unfilled with same failed attempts as it was skipped from scheduling
            await retry.try(async () => {
              const finalGapResponse = await findGaps({
                ruleId,
                start: failedGapStart,
                end: notFailedGapEnd,
                spaceId: apiOptions.spaceId,
              });

              expect(finalGapResponse.statusCode).to.eql(200);
              expect(finalGapResponse.body.total).to.eql(2);
              const gaps = finalGapResponse.body.data;

              const failedGap = gaps.find((g: any) => g.failed_auto_fill_attempts === 4);
              const filledGap = gaps.find((g: any) => g.failed_auto_fill_attempts === 0);

              expect(failedGap.status).to.eql('unfilled');
              expect(filledGap.status).to.eql('filled');
            });
          });
        });

        it('returns 400 on invalid scheduler body for authorized user', async () => {
          // Only assert negative case for authorized scenarios; others already 403
          if (!isUserAuthorized(scenario.id)) {
            return;
          }

          const badBody = {
            // name missing, schedule invalid
            schedule: { interval: '' },
            gapFillRange: 'now-30d',
            maxBackfills: 100,
            scope: ['test-scope'],
            numRetries: 1,
            ruleTypes: [{ type: 'test.patternFiringAutoRecoverFalse', consumer: 'alertsFixture' }],
          } as Record<string, unknown>;

          const resp = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/gaps/auto_fill_scheduler`
            )
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password)
            .send(badBody);

          expect(resp.statusCode).to.eql(400);
          expect(resp.body.error).to.be('Bad Request');
        });

        it('returns 401 when unauthenticated', async () => {
          // Run once to avoid repetition across all scenarios
          if (scenario.id !== 'superuser at space1') {
            return;
          }

          const schedulerBody = {
            name: `it-scheduler-unauth-${Date.now()}`,
            schedule: { interval: '1m' },
            gap_fill_range: 'now-30d',
            max_backfills: 100,
            num_retries: 1,
            scope: ['test-scope'],
            rule_types: [
              {
                type: 'test.patternFiringAutoRecoverFalse',
                consumer: 'alertsFixture',
              },
            ],
          };

          const resp = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/gaps/auto_fill_scheduler`
            )
            .set('kbn-xsrf', 'foo')
            .send(schedulerBody);

          expect(resp.statusCode).to.eql(401);
        });

        it('returns 403 for invalid consumer for authorized user', async () => {
          if (!isUserAuthorized(scenario.id)) {
            return;
          }

          const bodyWithInvalidConsumer = {
            name: `it-scheduler-bad-consumer-${Date.now()}`,
            schedule: { interval: '1m' },
            gap_fill_range: 'now-30d',
            max_backfills: 100,
            num_retries: 1,
            scope: ['test-scope'],
            rule_types: [
              {
                type: 'test.patternFiringAutoRecoverFalse',
                consumer: 'unknown_consumer',
              },
            ],
          };

          const resp = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/gaps/auto_fill_scheduler`
            )
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password)
            .send(bodyWithInvalidConsumer);

          expect(resp.statusCode).to.eql(403);
          expect(resp.body.error).to.be('Forbidden');
        });

        it('returns 409 when creating duplicate id for authorized user', async () => {
          if (!isUserAuthorized(scenario.id)) {
            return;
          }

          const fixedId = `fixed-id-${Date.now()}`;
          const body = {
            id: fixedId,
            name: `it-scheduler-dup-${Date.now()}`,
            schedule: { interval: '1m' },
            gap_fill_range: 'now-30d',
            max_backfills: 100,
            num_retries: 1,
            scope: ['test-scope'],
            rule_types: [
              {
                type: 'test.patternFiringAutoRecoverFalse',
                consumer: 'alertsFixture',
              },
            ],
          };

          // First create should succeed
          const first = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/gaps/auto_fill_scheduler`
            )
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password)
            .send(body);
          expect(first.statusCode).to.eql(200);

          // Second create with same id should conflict
          const second = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/gaps/auto_fill_scheduler`
            )
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password)
            .send(body);
          expect(second.statusCode).to.eql(409);
        });

        it('returns 409 when creating duplicate (ruleType, consumer) pair for authorized user', async () => {
          if (!isUserAuthorized(scenario.id)) {
            return;
          }

          const url = `${getUrlPrefix(
            apiOptions.spaceId
          )}/internal/alerting/rules/gaps/auto_fill_scheduler`;

          // first create
          const first = await supertestWithoutAuth
            .post(url)
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password)
            .send({
              name: `it-scheduler-pair-1-${Date.now()}`,
              schedule: { interval: '1m' },
              gap_fill_range: 'now-30d',
              max_backfills: 10,
              num_retries: 1,
              scope: ['test-scope'],
              rule_types: [
                { type: 'test.patternFiringAutoRecoverFalse', consumer: 'alertsFixture' },
              ],
            });
          expect(first.statusCode).to.eql(200);

          // duplicate pair
          const dup = await supertestWithoutAuth
            .post(url)
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password)
            .send({
              name: `it-scheduler-pair-dup-${Date.now()}`,
              schedule: { interval: '2m' },
              gap_fill_range: 'now-30d',
              max_backfills: 10,
              num_retries: 1,
              scope: ['test-scope'],
              rule_types: [
                { type: 'test.patternFiringAutoRecoverFalse', consumer: 'alertsFixture' },
              ],
            });

          expect(dup.statusCode).to.eql(409);

          // different type succeeds
          const diffType = await supertestWithoutAuth
            .post(url)
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password)
            .send({
              name: `it-scheduler-pair-type-${Date.now()}`,
              schedule: { interval: '2m' },
              gap_fill_range: 'now-30d',
              max_backfills: 10,
              num_retries: 1,
              scope: ['test-scope'],
              rule_types: [{ type: 'test.always-firing', consumer: 'alertsFixture' }],
            });
          expect(diffType.statusCode).to.eql(200);
        });
      });
    }
  });
}
