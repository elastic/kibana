/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const osqueryPublicApiVersion = '2023-10-31';

  const createSavedQuery = (id: string) =>
    supertest
      .post('/api/osquery/saved_queries')
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', osqueryPublicApiVersion)
      .send({
        id,
        query: 'select 1;',
        interval: '3600',
      });

  const getSavedQuery = (savedObjectId: string) =>
    supertest
      .get(`/api/osquery/saved_queries/${savedObjectId}`)
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', osqueryPublicApiVersion);

  const deleteSavedQuery = (savedObjectId: string) =>
    supertest
      .delete(`/api/osquery/saved_queries/${savedObjectId}`)
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', osqueryPublicApiVersion);

  const updateSavedQuery = (savedObjectId: string, id: string) =>
    supertest
      .put(`/api/osquery/saved_queries/${savedObjectId}`)
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', osqueryPublicApiVersion)
      .send({
        id,
        query: 'select 2;',
        interval: 3600,
      });

  const findSavedQueries = () =>
    supertest
      .get('/api/osquery/saved_queries?page=1&pageSize=20')
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', osqueryPublicApiVersion);

  describe('Saved queries', () => {
    it('creates, reads, and deletes a saved query', async () => {
      const savedQueryId = `saved-query-${Date.now()}`;

      const createResponse = await createSavedQuery(savedQueryId);
      expect(createResponse.status).to.be(200);
      const savedObjectId = createResponse.body.data.saved_object_id;

      const readResponse = await getSavedQuery(savedObjectId);
      expect(readResponse.status).to.be(200);
      expect(readResponse.body.data.id).to.be(savedQueryId);

      const updatedSavedQueryId = `${savedQueryId}-updated`;
      const updateResponse = await updateSavedQuery(savedObjectId, updatedSavedQueryId);
      expect(updateResponse.status).to.be(200);
      expect(updateResponse.body.data.id).to.be(updatedSavedQueryId);

      const findResponse = await findSavedQueries();
      expect(findResponse.status).to.be(200);
      expect(
        findResponse.body.data.some(
          (savedQuery: { id: string }) => savedQuery.id === updatedSavedQueryId
        )
      ).to.be(true);

      const deleteResponse = await deleteSavedQuery(savedObjectId);
      expect(deleteResponse.status).to.be(200);
    });
  });
}
