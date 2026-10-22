/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../../scenarios';
import { getUrlPrefix } from '../../../../common/lib/space_test_utils';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

export default function listActionTypesTests({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('connector_types', () => {
    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should return 200 with list of action types containing defaults', async () => {
          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix(space.id)}/api/actions/connector_types`)
            .auth(user.username, user.password);

          function createActionTypeMatcher(id: string, name: string) {
            return (actionType: { id: string; name: string }) => {
              return actionType.id === id && actionType.name === name;
            };
          }

          expect(response.statusCode).to.eql(200);
          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);
              // Check for values explicitly in order to avoid this test failing each time plugins register
              // a new action type
              expect(
                response.body.some(
                  createActionTypeMatcher('test.index-record', 'Test: Index Record')
                )
              ).to.be(true);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }

    describe('spec fields', () => {
      it('does not add spec fields to stack rows', async () => {
        const response = await supertestWithoutAuth
          .get(`${getUrlPrefix('space1')}/api/actions/connector_types`)
          .auth('superuser', 'superuser-password')
          .expect(200);

        const serverLog = response.body.find((entry: { id: string }) => entry.id === '.server-log');
        expect(serverLog).to.be.ok();
        expect(serverLog.source).to.eql('stack');
        expect(serverLog).not.to.have.property('icon');
        expect(serverLog).not.to.have.property('docs_url');
        expect(serverLog).not.to.have.property('auth_type_ids');
        expect(serverLog).not.to.have.property('has_inbound_events');
        expect(serverLog).not.to.have.property('is_inbound_only');
        expect(serverLog).not.to.have.property('is_ears_experimental');
        expect(serverLog).not.to.have.property('actions');
      });

      it('adds spec fields to spec rows without input schemas', async () => {
        const response = await supertestWithoutAuth
          .get(`${getUrlPrefix('space1')}/api/actions/connector_types?feature_id=workflows`)
          .auth('superuser', 'superuser-password')
          .expect(200);

        const singleFile = response.body.find(
          (entry: { id: string }) => entry.id === 'test.single_file_connector'
        );
        expect(singleFile).to.be.ok();
        expect(singleFile.source).to.eql('spec');
        expect(singleFile.auth_type_ids).to.be.an('array');
        expect(singleFile.auth_type_ids).to.contain('api_key_header');
        expect(singleFile).to.have.property('has_inbound_events');
        expect(singleFile).to.have.property('is_inbound_only');
        expect(singleFile).to.have.property('is_ears_experimental');
        expect(singleFile.actions.length).to.be.greaterThan(0);
        expect(singleFile).not.to.have.property('schema');
        expect(singleFile.actions[0]).not.to.have.property('input_schema');
      });

      it('returns spec fields to a user without Kibana feature privileges', async () => {
        const scenario = UserAtSpaceScenarios.find(
          (entry) => entry.id === 'no_kibana_privileges at space1'
        );
        if (!scenario) {
          throw new Error('Missing no_kibana_privileges scenario');
        }

        const response = await supertestWithoutAuth
          .get(`${getUrlPrefix('space1')}/api/actions/connector_types?feature_id=workflows`)
          .auth(scenario.user.username, scenario.user.password)
          .expect(200);

        const singleFile = response.body.find(
          (entry: { id: string }) => entry.id === 'test.single_file_connector'
        );
        expect(singleFile).to.be.ok();
        expect(singleFile.auth_type_ids).to.be.an('array');
        expect(singleFile.auth_type_ids).to.contain('api_key_header');
      });

      it('filters spec rows by feature_id=workflows', async () => {
        const response = await supertestWithoutAuth
          .get(`${getUrlPrefix('space1')}/api/actions/connector_types?feature_id=workflows`)
          .auth('superuser', 'superuser-password')
          .expect(200);

        const ids = response.body.map((entry: { id: string }) => entry.id);
        expect(ids).to.contain('test.single_file_connector');
        expect(ids).not.to.contain('.server-log');
      });

      it('returns an empty array for an unknown feature_id', async () => {
        const response = await supertestWithoutAuth
          .get(`${getUrlPrefix('space1')}/api/actions/connector_types?feature_id=does-not-exist`)
          .auth('superuser', 'superuser-password')
          .expect(200);

        expect(response.body).to.eql([]);
      });
    });
  });
}
