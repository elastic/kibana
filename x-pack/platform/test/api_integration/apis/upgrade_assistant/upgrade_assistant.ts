/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import { reindexOperationWithLargeErrorMessage } from './reindex_operation_with_large_error_message';

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertest = getService('supertest');

  describe('Upgrade Assistant', function () {
    describe('Reindex operation saved object', () => {
      const dotKibanaIndex = '.kibana';
      const fakeSavedObjectId = 'fakeSavedObjectId';

      after(async () => {
        // Clean up the fake saved object we created. This will error if the test failed.
        return await es.delete({ index: dotKibanaIndex, id: fakeSavedObjectId });
      });

      it('is indexed successfully with immense error message', async () => {
        // Guards against regression of https://github.com/elastic/kibana/pull/71710.
        const result = await es.create({
          index: dotKibanaIndex, // In normal operation this would be the .kibana-n index.
          id: fakeSavedObjectId,
          body: reindexOperationWithLargeErrorMessage,
        });
        expect(result).to.be.ok();
      });
    });

    describe('POST /api/upgrade_assistant/{indexName}/index_settings', () => {
      const indexName = 'update_settings_test_index';
      const indexSettings = {
        number_of_shards: '3',
        number_of_replicas: '2',
        refresh_interval: '1s',
      };

      before(async () => {
        // Create an index with settings that can be used for testing
        try {
          await es.indices.create({
            index: indexName,
            settings: {
              index: indexSettings,
            },
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.log('[Setup error] Error creating index');
          throw err;
        }
      });

      after(async () => {
        // Delete index created for test
        try {
          await es.indices.delete({
            index: indexName,
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.log('[Cleanup error] Error deleting index');
          throw err;
        }
      });

      it('removes index settings', async () => {
        const { body } = await supertest
          .post(`/api/upgrade_assistant/${indexName}/index_settings`)
          .set('kbn-xsrf', 'xxx')
          .send({
            settings: ['refresh_interval'], // index setting to remove
          })
          .expect(200);

        expect(body).to.eql({
          acknowledged: true,
        });

        // Refetch the index and verify settings were updated correctly
        try {
          const indexSettingsResponse = await es.indices.getSettings({
            index: indexName,
          });

          // @ts-expect-error @elastic/elasticsearch supports flatten 'index.*' keys only
          const updatedIndexSettings = indexSettingsResponse[indexName].settings.index;

          // Verify number_of_shards and number_of_replicas are unchanged
          expect(updatedIndexSettings?.number_of_shards).to.eql(indexSettings.number_of_shards);
          expect(updatedIndexSettings?.number_of_replicas).to.eql(indexSettings.number_of_replicas);
          // Verify refresh_interval no longer exists
          expect(updatedIndexSettings?.refresh_interval).to.be.eql(undefined);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.log('[Error] Unable to fetch index and verify index settings');
          throw err;
        }
      });

      it('handles error', async () => {
        const indexDoesNotExistName = 'index_does_not_exist';
        const { body } = await supertest
          .post(`/api/upgrade_assistant/${indexDoesNotExistName}/index_settings`)
          .set('kbn-xsrf', 'xxx')
          .send({
            settings: ['refresh_interval'], // index setting to remove
          })
          .expect(500);

        expect(body.error).to.eql('Internal Server Error');
      });
    });

    describe('GET /api/upgrade_assistant/status', () => {
      it('returns a successful response', async () => {
        const { body } = await supertest
          .get('/api/upgrade_assistant/status')
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        const expectedResponseKeys = ['readyForUpgrade', 'details'];
        // We're not able to easily test different upgrade status scenarios (there are tests with mocked data to handle this)
        // so, for now, we simply verify the response returns the expected format
        expectedResponseKeys.forEach((key) => {
          expect(body[key]).to.not.equal(undefined);
        });
      });

      it('returns a successful response when upgrading to the next minor', async () => {
        const { body } = await supertest
          .get('/api/upgrade_assistant/status')
          .query({
            targetVersion: '9.1.0',
          })
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        const expectedResponseKeys = ['readyForUpgrade', 'details'];
        // We're not able to easily test different upgrade status scenarios (there are tests with mocked data to handle this)
        // so, for now, we simply verify the response returns the expected format
        expectedResponseKeys.forEach((key) => {
          expect(body[key]).to.not.equal(undefined);
        });
      });

      it('returns a successful response when upgrading to the next major', async () => {
        const { body } = await supertest
          .get('/api/upgrade_assistant/status')
          .query({
            targetVersion: '10.0.0',
          })
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        const expectedResponseKeys = ['readyForUpgrade', 'details'];
        // We're not able to easily test different upgrade status scenarios (there are tests with mocked data to handle this)
        // so, for now, we simply verify the response returns the expected format
        expectedResponseKeys.forEach((key) => {
          expect(body[key]).to.not.equal(undefined);
        });
      });

      it('returns 403 forbidden error when upgrading more than 1 major', async () => {
        const { body } = await supertest
          .get('/api/upgrade_assistant/status')
          .query({
            targetVersion: '11.0.0',
          })
          .set('kbn-xsrf', 'xxx')
          .expect(403);
        expect(body.message).to.be('Forbidden');
      });

      it('returns 403 forbidden error when attempting to downgrade', async () => {
        const { body } = await supertest
          .get('/api/upgrade_assistant/status')
          .query({
            targetVersion: '8.0.0',
          })
          .set('kbn-xsrf', 'xxx')
          .expect(403);
        expect(body.message).to.be('Forbidden');
      });
    });
  });
}
