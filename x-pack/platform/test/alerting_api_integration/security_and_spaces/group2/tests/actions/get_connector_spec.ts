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

export default function getConnectorSpecTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('get connector spec', () => {
    describe('basic functionality', () => {
      it('returns spec for a valid spec-based connector (alienvault-otx)', async () => {
        const response = await supertest
          .get(`${getUrlPrefix('space1')}/internal/actions/connector_types/.alienvault-otx/spec`)
          .set('kbn-xsrf', 'foo')
          .expect(200);

        expect(response.body.metadata).to.have.property('id', '.alienvault-otx');
        expect(response.body.metadata).to.have.property('display_name');
        expect(response.body.metadata).to.have.property('description');
        expect(response.body.metadata).to.have.property('minimum_license', 'gold');
        expect(response.body.metadata.supported_feature_ids).to.contain('workflows');
        expect(typeof response.body.metadata.display_name).to.eql('string');
        expect(typeof response.body.metadata.description).to.eql('string');
        expect(Array.isArray(response.body.metadata.supported_feature_ids)).to.eql(true);

        expect(response.body).to.have.property('schema');
        expect(response.body.schema).to.be.an('object');
        expect(response.body.schema).to.have.property('type');
        expect(response.body.schema).to.have.property('properties');

        const { properties } = response.body.schema;
        expect(properties).to.have.property('secrets');

        const secretsAuthTypes = properties.secrets.oneOf ?? properties.secrets.anyOf;
        expect(secretsAuthTypes).to.have.length(1);
        expect(secretsAuthTypes[0].properties.authType.const).to.eql('api_key_header');
        expect(secretsAuthTypes[0].properties).to.have.property('X-OTX-API-KEY');
      });

      it('returns 404 for non-spec connector (.server-log)', async () => {
        await supertest
          .get(`${getUrlPrefix('space1')}/internal/actions/connector_types/.server-log/spec`)
          .set('kbn-xsrf', 'foo')
          .expect(404);
      });

      it('returns 404 for unknown connector type', async () => {
        const response = await supertest
          .get(
            `${getUrlPrefix('space1')}/internal/actions/connector_types/nonexistent-connector/spec`
          )
          .set('kbn-xsrf', 'foo')
          .expect(404);

        expect(response.body).to.have.property('message');
        expect(response.body.message).to.contain('not found');
      });
    });

    describe('authorization', () => {
      for (const scenario of UserAtSpaceScenarios) {
        const { user, space } = scenario;
        describe(scenario.id, () => {
          it('should handle authorization correctly', async () => {
            const response = await supertestWithoutAuth
              .get(
                `${getUrlPrefix(space.id)}/internal/actions/connector_types/.alienvault-otx/spec`
              )
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
                expect(response.body).to.have.property('metadata');
                expect(response.body).to.have.property('schema');
                expect(response.body.metadata.id).to.eql('.alienvault-otx');
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
          .get('/internal/actions/connector_types/.alienvault-otx/spec')
          .set('kbn-xsrf', 'foo')
          .expect(200);

        expect(response.body.metadata.id).to.eql('.alienvault-otx');
      });
    });
  });
}
