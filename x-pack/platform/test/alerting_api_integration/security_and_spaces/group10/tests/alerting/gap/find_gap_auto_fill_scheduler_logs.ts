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
import { getUrlPrefix, ObjectRemover } from '../../../../../common/lib';

export default function findGapAutoFillSchedulerLogsTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('gap auto fill scheduler - find logs', () => {
    const objectRemover = new ObjectRemover(supertest);

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

        it('gets scheduler logs by id', async () => {
          const createBody = {
            name: `it-scheduler-logs-${Date.now()}`,
            schedule: { interval: '1m' },
            gap_fill_range: 'now-30d',
            max_backfills: 10,
            num_retries: 1,
            scope: ['test-scope'],
            rule_types: [{ type: 'test.patternFiringAutoRecoverFalse', consumer: 'alertsFixture' }],
          };
          const createResp = await supertest
            .post(
              `${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/gaps/auto_fill_scheduler`
            )
            .set('kbn-xsrf', 'foo')
            .send(createBody);
          expect(createResp.statusCode).to.eql(200);
          const schedulerId = createResp.body.id ?? createResp.body?.body?.id;
          expect(typeof schedulerId).to.be('string');

          const start = moment().subtract(7, 'days').toISOString();
          const end = moment().toISOString();

          const getLogsResp = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(
                apiOptions.spaceId
              )}/internal/alerting/rules/gaps/auto_fill_scheduler/${schedulerId}/logs`
            )
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password)
            .send({
              start,
              end,
              page: 1,
              per_page: 50,
              sort_field: '@timestamp',
              sort_direction: 'desc',
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(getLogsResp.statusCode).to.eql(403);
              break;
            case 'global_read at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1': {
              expect(getLogsResp.statusCode).to.eql(200);
              const body = getLogsResp.body ?? getLogsResp.body?.body;
              // Minimal shape/assertions
              expect(body).to.have.property('data');
              expect(Array.isArray(body.data)).to.be(true);
              expect(body).to.have.property('total');
              expect(typeof body.total).to.be('number');
              expect(body).to.have.property('page');
              expect(typeof body.page).to.be('number');
              expect(body).to.have.property('per_page');
              expect(typeof body.per_page).to.be('number');

              // Test 404 for non-existent id when authorized
              const notFoundResp = await supertestWithoutAuth
                .get(
                  `${getUrlPrefix(
                    apiOptions.spaceId
                  )}/internal/alerting/rules/gaps/auto_fill_scheduler/does-not-exist/logs`
                )
                .query({
                  start,
                  end,
                  page: 1,
                  per_page: 50,
                  sort_field: '@timestamp',
                  sort_direction: 'desc',
                })
                .auth(apiOptions.username, apiOptions.password);
              expect(notFoundResp.statusCode).to.eql(404);
              break;
            }
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('gets scheduler logs with status filter', async () => {
          if (
            ![
              'superuser at space1',
              'space_1_all at space1',
              'space_1_all_alerts_none_actions at space1',
              'space_1_all_with_restricted_fixture at space1',
            ].includes(scenario.id)
          ) {
            return;
          }

          const createBody = {
            name: `it-scheduler-logs-status-${Date.now()}`,
            schedule: { interval: '1m' },
            gap_fill_range: 'now-30d',
            max_backfills: 10,
            num_retries: 1,
            scope: ['test-scope'],
            rule_types: [{ type: 'test.patternFiringAutoRecoverFalse', consumer: 'alertsFixture' }],
          };
          const createResp = await supertest
            .post(
              `${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/gaps/auto_fill_scheduler`
            )
            .set('kbn-xsrf', 'foo')
            .send(createBody);
          expect(createResp.statusCode).to.eql(200);
          const schedulerId = createResp.body.id ?? createResp.body?.body?.id;

          const start = moment().subtract(7, 'days').toISOString();
          const end = moment().toISOString();

          const getLogsResp = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(
                apiOptions.spaceId
              )}/internal/alerting/rules/gaps/auto_fill_scheduler/${schedulerId}/logs`
            )
            .auth(apiOptions.username, apiOptions.password)
            .set('kbn-xsrf', 'foo')
            .send({
              start,
              end,
              page: 1,
              per_page: 50,
              sort_field: '@timestamp',
              sort_direction: 'desc',
              statuses: ['success', 'error'],
            });

          expect(getLogsResp.statusCode).to.eql(200);
          const body = getLogsResp.body ?? getLogsResp.body?.body;
          expect(body).to.have.property('data');
          expect(Array.isArray(body.data)).to.be(true);
        });

        it('gets scheduler logs with pagination', async () => {
          if (
            ![
              'superuser at space1',
              'space_1_all at space1',
              'space_1_all_alerts_none_actions at space1',
              'space_1_all_with_restricted_fixture at space1',
            ].includes(scenario.id)
          ) {
            return;
          }

          const createBody = {
            name: `it-scheduler-logs-pagination-${Date.now()}`,
            schedule: { interval: '1m' },
            gap_fill_range: 'now-30d',
            max_backfills: 10,
            num_retries: 1,
            scope: ['test-scope'],
            rule_types: [{ type: 'test.patternFiringAutoRecoverFalse', consumer: 'alertsFixture' }],
          };
          const createResp = await supertest
            .post(
              `${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/gaps/auto_fill_scheduler`
            )
            .set('kbn-xsrf', 'foo')
            .send(createBody);
          expect(createResp.statusCode).to.eql(200);
          const schedulerId = createResp.body.id ?? createResp.body?.body?.id;

          const start = moment().subtract(7, 'days').toISOString();
          const end = moment().toISOString();

          const getLogsResp = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(
                apiOptions.spaceId
              )}/internal/alerting/rules/gaps/auto_fill_scheduler/${schedulerId}/logs`
            )
            .auth(apiOptions.username, apiOptions.password)
            .set('kbn-xsrf', 'foo')
            .send({
              start,
              end,
              page: 1,
              per_page: 10,
              sort_field: '@timestamp',
              sort_direction: 'asc',
            });

          expect(getLogsResp.statusCode).to.eql(200);
          const body = getLogsResp.body ?? getLogsResp.body?.body;
          expect(body).to.have.property('data');
          expect(body).to.have.property('page');
          expect(body.page).to.eql(1);
          expect(body).to.have.property('per_page');
          expect(body.per_page).to.eql(10);
        });
      });
    }
  });
}
