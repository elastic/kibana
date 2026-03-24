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

  const findSavedQueriesWithParams = (params: string) =>
    supertest
      .get(`/api/osquery/saved_queries?${params}`)
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

    describe('profile_uid fields', () => {
      let savedObjectId: string;
      const queryId = `profile-uid-query-${Date.now()}`;

      before(async () => {
        const response = await createSavedQuery(queryId).expect(200);
        savedObjectId = response.body.data.saved_object_id;
      });

      after(async () => {
        if (savedObjectId) {
          await deleteSavedQuery(savedObjectId);
        }
      });

      it('includes profile_uid fields on create response', async () => {
        const response = await createSavedQuery(`profile-uid-query-2-${Date.now()}`).expect(200);
        const { data } = response.body;
        expect(data).to.have.property('created_by_profile_uid');
        expect(data).to.have.property('updated_by_profile_uid');
        await deleteSavedQuery(data.saved_object_id);
      });

      it('includes profile_uid fields on read response', async () => {
        const response = await getSavedQuery(savedObjectId).expect(200);
        expect(response.body.data).to.have.property('created_by_profile_uid');
        expect(response.body.data).to.have.property('updated_by_profile_uid');
      });

      it('includes profile_uid fields in find response', async () => {
        const response = await findSavedQueries().expect(200);
        const match = response.body.data.find((q: { id: string }) => q.id === queryId);
        expect(match).to.be.ok();
        expect(match).to.have.property('created_by_profile_uid');
        expect(match).to.have.property('updated_by_profile_uid');
      });
    });

    describe('users route', () => {
      const usersPrefix = `users-query-${Date.now()}`;
      const savedObjectIds: string[] = [];

      before(async () => {
        for (const suffix of ['one', 'two']) {
          const response = await createSavedQuery(`${usersPrefix}-${suffix}`).expect(200);
          savedObjectIds.push(response.body.data.saved_object_id);
        }
      });

      after(async () => {
        for (const soId of savedObjectIds) {
          await deleteSavedQuery(soId);
        }
      });

      it('returns unique users with profile UIDs', async () => {
        const response = await supertest
          .get('/internal/osquery/saved_queries/users')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '1')
          .expect(200);

        expect(response.body.data).to.be.an(Array);
        expect(response.body.data.length).to.be.greaterThan(0);

        const users = response.body.data.map((c: { created_by: string }) => c.created_by);
        expect(users).to.contain('elastic');

        // Verify uniqueness
        const uniqueUsers = [...new Set(users)];
        expect(uniqueUsers.length).to.be(users.length);
      });

      it('includes created_by_profile_uid when available', async () => {
        const response = await supertest
          .get('/internal/osquery/saved_queries/users')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '1')
          .expect(200);

        const elastic = response.body.data.find(
          (c: { created_by: string }) => c.created_by === 'elastic'
        );
        expect(elastic).to.be.ok();
        expect(elastic).to.have.property('created_by');
      });
    });

    describe('find with search and createdBy params', () => {
      const uniquePrefix = `findtest-${Date.now()}`;
      const queryIds: string[] = [];
      const savedObjectIds: string[] = [];

      before(async () => {
        for (const suffix of ['alpha', 'beta', 'gamma']) {
          const id = `${uniquePrefix}-${suffix}`;
          const response = await createSavedQuery(id).expect(200);
          queryIds.push(id);
          savedObjectIds.push(response.body.data.saved_object_id);
        }
      });

      after(async () => {
        for (const soId of savedObjectIds) {
          await deleteSavedQuery(soId);
        }
      });

      it('filters by search term matching query id', async () => {
        const response = await findSavedQueriesWithParams(`search=${uniquePrefix}-alpha`).expect(
          200
        );
        expect(response.body.total).to.be.greaterThan(0);
        expect(
          response.body.data.some((q: { id: string }) => q.id === `${uniquePrefix}-alpha`)
        ).to.be(true);
      });

      it('returns empty results for non-matching search', async () => {
        const response = await findSavedQueriesWithParams('search=zzzznonexistent999').expect(200);
        expect(response.body.total).to.be(0);
      });

      it('filters by createdBy', async () => {
        const response = await findSavedQueriesWithParams(`createdBy=elastic&pageSize=100`).expect(
          200
        );
        expect(response.body.total).to.be.greaterThan(0);
        const creators = response.body.data.map((q: { created_by: string }) => q.created_by);
        const uniqueCreators = [...new Set(creators)];
        expect(uniqueCreators).to.eql(['elastic']);
      });

      it('returns empty results for non-matching createdBy', async () => {
        const response = await findSavedQueriesWithParams('createdBy=nonexistentuser').expect(200);
        expect(response.body.total).to.be(0);
      });
    });

    describe('404 for non-existent resources', () => {
      it('returns 404 when reading a non-existent saved query', async () => {
        await getSavedQuery('non-existent-id').expect(404);
      });

      it('returns 404 when updating a non-existent saved query', async () => {
        await updateSavedQuery('non-existent-id', 'updated-name').expect(404);
      });

      it('returns 404 when deleting a non-existent saved query', async () => {
        await deleteSavedQuery('non-existent-id').expect(404);
      });
    });
  });
}
