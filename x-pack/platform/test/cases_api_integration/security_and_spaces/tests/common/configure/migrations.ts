/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common/constants';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import {
  getConfiguration,
  getConfigureSavedObjectsFromES,
  getConnectorMappingsFromES,
} from '../../../../common/lib/api';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');

  describe('migrations', () => {
    describe('7.13.2', () => {
      // `cases-configure` and `cases-connector-mappings` are not importable via the standard SO
      // import API, so we use kibanaServer.savedObjects.create with old migrationVersion to trigger
      // DocumentMigrator (adds owner field, moves connector.id to references).
      const CONFIGURE_ID = 'd95d5640-cf9d-11eb-a603-13e7747d215c';
      const CONNECTOR_MAPPINGS_ID = 'd903c490-cf9d-11eb-a603-13e7747d215c';

      before(async () => {
        await kibanaServer.savedObjects.create({
          type: 'cases-configure',
          id: CONFIGURE_ID,
          overwrite: true,
          attributes: {
            closure_type: 'close-by-user',
            connector: {
              fields: [],
              id: 'd68508f0-cf9d-11eb-a603-13e7747d215c',
              name: 'Test Jira',
              type: '.jira',
            },
            created_at: '2021-06-17T18:57:21.091Z',
            created_by: { email: null, full_name: 'j@j.com', username: '711621466' },
            updated_at: null,
            updated_by: null,
          },
          migrationVersion: { 'cases-configure': '7.10.0' },
          references: [],
        });
        await kibanaServer.savedObjects.create({
          type: 'cases-connector-mappings',
          id: CONNECTOR_MAPPINGS_ID,
          overwrite: true,
          attributes: {
            mappings: [
              { action_type: 'overwrite', source: 'title', target: 'summary' },
              { action_type: 'overwrite', source: 'description', target: 'description' },
              { action_type: 'append', source: 'comments', target: 'comments' },
            ],
          },
          migrationVersion: {},
          references: [
            {
              id: 'd68508f0-cf9d-11eb-a603-13e7747d215c',
              name: 'associated-action',
              type: 'action',
            },
          ],
        });
      });

      after(async () => {
        await kibanaServer.savedObjects
          .delete({ type: 'cases-configure', id: CONFIGURE_ID })
          .catch(() => undefined);
        await kibanaServer.savedObjects
          .delete({ type: 'cases-connector-mappings', id: CONNECTOR_MAPPINGS_ID })
          .catch(() => undefined);
      });

      describe('owner field', () => {
        it('adds the owner field', async () => {
          const configuration = await getConfiguration({
            supertest,
            query: { owner: SECURITY_SOLUTION_OWNER },
          });

          expect(configuration[0].owner).to.be(SECURITY_SOLUTION_OWNER);
        });

        it('adds the owner field to the connector mapping', async () => {
          // We don't get the owner field back from the mappings when we retrieve the configuration so the only way to
          // check that the migration worked is by checking the saved object stored in Elasticsearch directly
          const mappings = await getConnectorMappingsFromES({ es });
          expect(mappings.body.hits.hits.length).to.be(1);
          expect(mappings.body.hits.hits[0]._source?.['cases-connector-mappings'].owner).to.eql(
            SECURITY_SOLUTION_OWNER
          );
        });
      });

      describe('migrating connector id to a reference', () => {
        it('preserves the connector id after migration in the API response', async () => {
          const configuration = await getConfiguration({
            supertest,
            query: { owner: SECURITY_SOLUTION_OWNER },
          });

          expect(configuration[0].connector.id).to.be('d68508f0-cf9d-11eb-a603-13e7747d215c');
        });

        it('preserves the connector fields after migration in the API response', async () => {
          const configuration = await getConfiguration({
            supertest,
            query: { owner: SECURITY_SOLUTION_OWNER },
          });

          expect(configuration[0].connector).to.eql({
            fields: null,
            id: 'd68508f0-cf9d-11eb-a603-13e7747d215c',
            name: 'Test Jira',
            type: '.jira',
          });
        });

        it('removes the connector id field in the saved object', async () => {
          const configurationFromES = await getConfigureSavedObjectsFromES({ es });
          expect(
            configurationFromES.body.hits.hits[0]._source?.['cases-configure'].connector
          ).to.not.have.property('id');
        });
      });
    });
  });
}
