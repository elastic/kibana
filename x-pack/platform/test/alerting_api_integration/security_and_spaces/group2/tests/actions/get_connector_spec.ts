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

// eslint-disable-next-line import/no-default-export
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

        // Verify metadata structure
        expect(response.body).to.have.property('metadata');
        expect(response.body.metadata).to.have.property('id', '.alienvault-otx');
        expect(response.body.metadata).to.have.property('displayName');
        expect(response.body.metadata).to.have.property('description');
        expect(response.body.metadata).to.have.property('minimumLicense');
        expect(response.body.metadata).to.have.property('supportedFeatureIds');
        expect(response.body.metadata.supportedFeatureIds).to.be.an('array');

        // Verify schema structure
        expect(response.body).to.have.property('schema');
        expect(response.body.schema).to.be.an('object');
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

      it('schema contains valid JSON Schema structure', async () => {
        const response = await supertest
          .get(`${getUrlPrefix('space1')}/internal/actions/connector_types/.alienvault-otx/spec`)
          .set('kbn-xsrf', 'foo')
          .expect(200);

        const { schema } = response.body;

        // JSON Schema should have type, typically 'object'
        expect(schema).to.have.property('type');
        // Should have properties for config and secrets
        expect(schema).to.have.property('properties');
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
      it('metadata contains all required fields', async () => {
        const response = await supertest
          .get(`${getUrlPrefix('space1')}/internal/actions/connector_types/.alienvault-otx/spec`)
          .set('kbn-xsrf', 'foo')
          .expect(200);

        const { metadata } = response.body;

        // Required fields per the route schema
        expect(metadata).to.have.property('id');
        expect(metadata).to.have.property('displayName');
        expect(metadata).to.have.property('description');
        expect(metadata).to.have.property('minimumLicense');
        expect(metadata).to.have.property('supportedFeatureIds');

        // Type validations
        expect(typeof metadata.id).to.eql('string');
        expect(typeof metadata.displayName).to.eql('string');
        expect(typeof metadata.description).to.eql('string');
        expect(typeof metadata.minimumLicense).to.eql('string');
        expect(Array.isArray(metadata.supportedFeatureIds)).to.eql(true);
      });

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
