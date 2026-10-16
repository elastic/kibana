/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../../scenarios';
import { getUrlPrefix } from '../../../../common/lib';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

export default function getAllConnectorSpecsTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('get all connector specs', () => {
    describe('basic functionality', () => {
      it('returns spec-backed types and excludes classic types', async () => {
        const response = await supertest
          .get(`${getUrlPrefix('space1')}/internal/actions/connector_types/specs`)
          .set('kbn-xsrf', 'foo')
          .expect(200);

        expect(Array.isArray(response.body)).to.eql(true);
        const ids = response.body.map((entry: { id: string }) => entry.id);
        expect(ids).to.contain('.alienvault-otx');
        expect(ids).to.contain('test.single_file_connector');
        expect(ids).not.to.contain('.server-log');

        const otx = response.body.find((entry: { id: string }) => entry.id === '.alienvault-otx');
        expect(otx).to.have.property('auth_type_ids');
        expect(otx).to.have.property('availability');
        expect(otx).to.have.property('actions');
        expect(otx).not.to.have.property('schema');
        expect(otx.actions[0]).not.to.have.property('input_schema');
      });

      it('filters by feature_id=workflows', async () => {
        const response = await supertest
          .get(
            `${getUrlPrefix('space1')}/internal/actions/connector_types/specs?feature_id=workflows`
          )
          .set('kbn-xsrf', 'foo')
          .expect(200);

        const ids = response.body.map((entry: { id: string }) => entry.id);
        expect(ids).to.contain('test.single_file_connector');
      });

      it('returns an empty array for an unknown feature_id', async () => {
        const response = await supertest
          .get(
            `${getUrlPrefix(
              'space1'
            )}/internal/actions/connector_types/specs?feature_id=does-not-exist`
          )
          .set('kbn-xsrf', 'foo')
          .expect(200);

        expect(response.body).to.eql([]);
      });
    });

    describe('authorization', () => {
      for (const scenario of UserAtSpaceScenarios) {
        const { user, space } = scenario;
        describe(scenario.id, () => {
          it('should handle authorization correctly', async () => {
            const response = await supertestWithoutAuth
              .get(`${getUrlPrefix(space.id)}/internal/actions/connector_types/specs`)
              .auth(user.username, user.password);

            switch (scenario.id) {
              case 'no_kibana_privileges at space1':
              case 'space_1_all_alerts_none_actions at space1':
              case 'space_1_all at space2':
                expect(response.statusCode).to.eql(403);
                expect(response.body).to.eql({
                  statusCode: 403,
                  error: 'Forbidden',
                  message: 'Unauthorized to get actions',
                });
                break;
              case 'global_read at space1':
              case 'superuser at space1':
              case 'space_1_all at space1':
              case 'space_1_all_with_restricted_fixture at space1':
                expect(response.statusCode).to.eql(200);
                expect(Array.isArray(response.body)).to.eql(true);
                break;
              default:
                throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
            }
          });
        });
      }
    });

    describe('response validation', () => {
      it('works without space prefix (default space)', async () => {
        const response = await supertest
          .get('/internal/actions/connector_types/specs')
          .set('kbn-xsrf', 'foo')
          .expect(200);

        expect(Array.isArray(response.body)).to.eql(true);
        const ids = response.body.map((entry: { id: string }) => entry.id);
        expect(ids).to.contain('.alienvault-otx');
      });
    });
  });
}
