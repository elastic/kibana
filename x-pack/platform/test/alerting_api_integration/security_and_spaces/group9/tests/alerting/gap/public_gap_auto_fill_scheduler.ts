/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  UserAtSpaceScenarios,
  ManageRuleSettingsOnlyUserAtSpace1,
  SuperuserAtSpace1,
} from '../../../../scenarios';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { getUrlPrefix } from '../../../../../common/lib';

const PUBLIC_PATH = '/api/alerting/rules/gaps/auto_fill_scheduler';

export default function publicGapAutoFillSchedulerTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  const getSchedulerBody = (
    overrides: { id?: string } & Record<string, unknown> = {}
  ): { id?: string } & Record<string, unknown> => ({
    name: `public-scheduler-${Date.now()}`,
    enabled: true,
    schedule: { interval: '1m' },
    gap_fill_range: 'now-30d',
    max_backfills: 10,
    num_retries: 1,
    scope: ['test-scope'],
    rule_types: [{ type: 'test.patternFiringAutoRecoverFalse', consumer: 'alertsFixture' }],
    ...overrides,
  });

  const deleteAllSchedulers = async (spaceId: string) => {
    await supertest
      .post(`${getUrlPrefix(spaceId)}/_test/gap_auto_fill_scheduler/_delete_all`)
      .set('kbn-xsrf', 'foo')
      .send({});
  };

  describe('gap auto fill scheduler - public API', () => {
    const ScenariosToTest = [...UserAtSpaceScenarios, ManageRuleSettingsOnlyUserAtSpace1];

    for (const scenario of ScenariosToTest) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        afterEach(async () => {
          await deleteAllSchedulers(space.id);
        });

        it('applies the same authorization as the internal route', async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}${PUBLIC_PATH}`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(getSchedulerBody());

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              expect(response.statusCode).to.eql(403);
              break;

            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'manage_rule_settings_only at space1':
              expect(response.statusCode).to.eql(200);
              expect(typeof response.body.id).to.be('string');
              break;

            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }

    // Behavior does not vary by role, so the round trip runs once as superuser.
    describe(`${SuperuserAtSpace1.id} (runs once)`, () => {
      const { space } = SuperuserAtSpace1;
      const urlPrefix = getUrlPrefix(space.id);

      afterEach(async () => {
        await deleteAllSchedulers(space.id);
        await deleteAllSchedulers('default');
      });

      it('creates, gets, updates and deletes a scheduler by a caller-provided id', async () => {
        const id = `public-scheduler-${Date.now()}`;
        const createBody = getSchedulerBody({ id });

        const createResp = await supertest
          .post(`${urlPrefix}${PUBLIC_PATH}`)
          .set('kbn-xsrf', 'foo')
          .send(createBody);
        expect(createResp.statusCode).to.eql(200);
        expect(createResp.body).to.have.property('id', id);
        expect(createResp.body).to.have.property('enabled', true);
        expect(createResp.body.excluded_reasons).to.eql(['rule_disabled']);
        expect(createResp.body).to.have.property('created_at');
        expect(createResp.body).to.have.property('updated_at');

        const getResp = await supertest.get(`${urlPrefix}${PUBLIC_PATH}/${id}`);
        expect(getResp.statusCode).to.eql(200);
        expect(getResp.body.id).to.eql(id);
        expect(getResp.body.rule_types).to.eql(createBody.rule_types);

        const { id: _omitted, ...updateBody } = { ...createBody, enabled: false };
        const updateResp = await supertest
          .put(`${urlPrefix}${PUBLIC_PATH}/${id}`)
          .set('kbn-xsrf', 'foo')
          .send(updateBody);
        expect(updateResp.statusCode).to.eql(200);
        expect(updateResp.body.enabled).to.eql(false);

        // Repeating the same update leaves the scheduler in the same state.
        const repeatUpdateResp = await supertest
          .put(`${urlPrefix}${PUBLIC_PATH}/${id}`)
          .set('kbn-xsrf', 'foo')
          .send(updateBody);
        expect(repeatUpdateResp.statusCode).to.eql(200);
        expect(repeatUpdateResp.body.enabled).to.eql(false);

        const getAfterUpdate = await supertest.get(`${urlPrefix}${PUBLIC_PATH}/${id}`);
        expect(getAfterUpdate.body.enabled).to.eql(false);

        const deleteResp = await supertest
          .delete(`${urlPrefix}${PUBLIC_PATH}/${id}`)
          .set('kbn-xsrf', 'foo');
        expect(deleteResp.statusCode).to.eql(204);

        const getAfterDelete = await supertest.get(`${urlPrefix}${PUBLIC_PATH}/${id}`);
        expect(getAfterDelete.statusCode).to.eql(404);
      });

      it('returns 409 when a scheduler with the same id already exists', async () => {
        const id = `public-scheduler-dup-${Date.now()}`;
        await supertest
          .post(`${urlPrefix}${PUBLIC_PATH}`)
          .set('kbn-xsrf', 'foo')
          .send(getSchedulerBody({ id }))
          .expect(200);

        // A different rule type pair isolates the id conflict from the one-scheduler-per-pair check
        const duplicateResp = await supertest
          .post(`${urlPrefix}${PUBLIC_PATH}`)
          .set('kbn-xsrf', 'foo')
          .send(
            getSchedulerBody({ id, rule_types: [{ type: 'test.noop', consumer: 'alertsFixture' }] })
          );
        expect(duplicateResp.statusCode).to.eql(409);
      });

      it('returns 409 when a scheduler with the same rule type pair already exists', async () => {
        await supertest
          .post(`${urlPrefix}${PUBLIC_PATH}`)
          .set('kbn-xsrf', 'foo')
          .send(getSchedulerBody({ id: `public-scheduler-pair-a-${Date.now()}` }))
          .expect(200);

        const duplicatePairResp = await supertest
          .post(`${urlPrefix}${PUBLIC_PATH}`)
          .set('kbn-xsrf', 'foo')
          .send(getSchedulerBody({ id: `public-scheduler-pair-b-${Date.now()}` }));
        expect(duplicatePairResp.statusCode).to.eql(409);
      });

      it('returns 409 when the id is used by an enabled scheduler in another space', async () => {
        const id = `public-scheduler-cross-space-${Date.now()}`;
        await supertest
          .post(`${urlPrefix}${PUBLIC_PATH}`)
          .set('kbn-xsrf', 'foo')
          .send(getSchedulerBody({ id }))
          .expect(200);

        const otherSpaceResp = await supertest
          .post(`${getUrlPrefix('default')}${PUBLIC_PATH}`)
          .set('kbn-xsrf', 'foo')
          .send(getSchedulerBody({ id }));
        expect(otherSpaceResp.statusCode).to.eql(409);

        // The scheduler in the first space is untouched
        const getResp = await supertest.get(`${urlPrefix}${PUBLIC_PATH}/${id}`);
        expect(getResp.statusCode).to.eql(200);
        expect(getResp.body.enabled).to.eql(true);
      });

      it('returns 404 for get, update and delete of an unknown id', async () => {
        const id = 'public-scheduler-missing';

        const getResp = await supertest.get(`${urlPrefix}${PUBLIC_PATH}/${id}`);
        expect(getResp.statusCode).to.eql(404);

        const { id: _omitted, ...updateBody } = getSchedulerBody({ id });
        const updateResp = await supertest
          .put(`${urlPrefix}${PUBLIC_PATH}/${id}`)
          .set('kbn-xsrf', 'foo')
          .send(updateBody);
        expect(updateResp.statusCode).to.eql(404);

        const deleteResp = await supertest
          .delete(`${urlPrefix}${PUBLIC_PATH}/${id}`)
          .set('kbn-xsrf', 'foo');
        expect(deleteResp.statusCode).to.eql(404);
      });

      it('scopes schedulers to the space of the request', async () => {
        const id = `public-scheduler-space-${Date.now()}`;
        await supertest
          .post(`${urlPrefix}${PUBLIC_PATH}`)
          .set('kbn-xsrf', 'foo')
          .send(getSchedulerBody({ id }))
          .expect(200);

        const otherSpaceResp = await supertest.get(
          `${getUrlPrefix('default')}${PUBLIC_PATH}/${id}`
        );
        expect(otherSpaceResp.statusCode).to.eql(404);
      });

      it('rejects an invalid body with 400', async () => {
        const response = await supertest
          .post(`${urlPrefix}${PUBLIC_PATH}`)
          .set('kbn-xsrf', 'foo')
          .send(getSchedulerBody({ excluded_reasons: ['not_a_reason'] }));
        expect(response.statusCode).to.eql(400);
      });
    });
  });
}
