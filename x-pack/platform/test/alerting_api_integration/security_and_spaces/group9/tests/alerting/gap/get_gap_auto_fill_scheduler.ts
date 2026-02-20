/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../../../scenarios';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { getUrlPrefix } from '../../../../../common/lib';

export default function getGapAutoFillSchedulerTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('gap auto fill scheduler - get by id', () => {
    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        const apiOptions = {
          spaceId: space.id,
          username: user.username,
          password: user.password,
        };

        afterEach(async () => {
          await supertest
            .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/gap_auto_fill_scheduler/_delete_all`)
            .set('kbn-xsrf', 'foo')
            .send({});
        });

        it('gets scheduler by id with', async () => {
          const createBody = {
            name: `it-scheduler-get-${Date.now()}`,
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

          const getResp = await supertestWithoutAuth
            .get(
              `${getUrlPrefix(
                apiOptions.spaceId
              )}/internal/alerting/rules/gaps/auto_fill_scheduler/${schedulerId}`
            )
            .auth(apiOptions.username, apiOptions.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(getResp.statusCode).to.eql(403);
              break;
            case 'global_read at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1': {
              expect(getResp.statusCode).to.eql(200);
              const body = getResp.body ?? getResp.body?.body;
              // Minimal shape/assertions
              expect(body.id).to.eql(schedulerId);
              expect(typeof body.name).to.be('string');
              expect(body.schedule).to.have.property('interval');
              expect(typeof body.gap_fill_range).to.be('string');
              expect(typeof body.max_backfills).to.be('number');
              expect(typeof body.num_retries).to.be('number');
              break;
            }
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('returns 404 for non-existent id when authorized', async () => {
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

          const resp = await supertestWithoutAuth
            .get(
              `${getUrlPrefix(
                apiOptions.spaceId
              )}/internal/alerting/rules/gaps/auto_fill_scheduler/does-not-exist`
            )
            .auth(apiOptions.username, apiOptions.password);
          expect(resp.statusCode).to.eql(404);
        });
      });
    }
  });
}
