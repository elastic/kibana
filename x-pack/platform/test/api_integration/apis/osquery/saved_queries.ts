/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

// Only the "users route" tests remain here — they require the queryHistoryRework
// experimental flag (enabled in config.ts) which registers the internal endpoint.
// All other saved-query tests have been migrated to Scout:
//   x-pack/platform/plugins/shared/osquery/test/scout/api/tests/saved_queries_*.spec.ts

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

  const deleteSavedQuery = (savedObjectId: string) =>
    supertest
      .delete(`/api/osquery/saved_queries/${savedObjectId}`)
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', osqueryPublicApiVersion);

  describe('Saved queries', () => {
    describe('CRUD contract tests', () => {
      it('create returns 200 with expected response shape', async () => {
        const id = `contract-create-${Date.now()}`;
        const response = await createSavedQuery(id).expect(200);

        const { data } = response.body;
        expect(data).to.be.ok();
        expect(data.id).to.be(id);
        expect(data.saved_object_id).to.be.a('string');
        expect(data.query).to.be('select 1;');
        expect(data.interval).to.be.ok();
        expect(data.created_at).to.be.a('string');
        expect(data.created_by).to.be.a('string');
        expect(data.updated_at).to.be.a('string');
        expect(data.updated_by).to.be.a('string');

        // Clean up
        await deleteSavedQuery(data.saved_object_id);
      });

      it('read returns 200 with expected response shape', async () => {
        const id = `contract-read-${Date.now()}`;
        const createResp = await createSavedQuery(id).expect(200);
        const savedObjectId = createResp.body.data.saved_object_id;

        const response = await supertest
          .get(`/api/osquery/saved_queries/${savedObjectId}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion)
          .expect(200);

        const { data } = response.body;
        expect(data).to.be.ok();
        expect(data.id).to.be(id);
        expect(data.saved_object_id).to.be(savedObjectId);
        expect(data.query).to.be('select 1;');
        expect(data.created_at).to.be.a('string');
        expect(data.updated_at).to.be.a('string');

        // Clean up
        await deleteSavedQuery(savedObjectId);
      });

      it('find returns paginated results with expected shape', async () => {
        const prefix = `contract-find-${Date.now()}`;
        const ids: string[] = [];

        for (const suffix of ['a', 'b']) {
          const resp = await createSavedQuery(`${prefix}-${suffix}`).expect(200);
          ids.push(resp.body.data.saved_object_id);
        }

        const response = await supertest
          .get(`/api/osquery/saved_queries?search=${prefix}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion)
          .expect(200);

        expect(response.body).to.have.property('page');
        expect(response.body).to.have.property('per_page');
        expect(response.body).to.have.property('total');
        expect(response.body.total).to.be(2);
        expect(response.body.data).to.be.an(Array);
        expect(response.body.data.length).to.be(2);

        // Verify data item shape
        const item = response.body.data[0];
        expect(item).to.have.property('saved_object_id');
        expect(item).to.have.property('id');
        expect(item).to.have.property('query');

        // Clean up
        for (const soId of ids) {
          await deleteSavedQuery(soId);
        }
      });

      it('update returns 200 with updated fields', async () => {
        const id = `contract-update-${Date.now()}`;
        const createResp = await createSavedQuery(id).expect(200);
        const savedObjectId = createResp.body.data.saved_object_id;

        const response = await supertest
          .put(`/api/osquery/saved_queries/${savedObjectId}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion)
          .send({
            id: `${id}-updated`,
            query: 'select 2;',
            interval: '7200',
          })
          .expect(200);

        const { data } = response.body;
        expect(data).to.be.ok();
        expect(data.id).to.be(`${id}-updated`);
        expect(data.query).to.be('select 2;');
        expect(data.saved_object_id).to.be(savedObjectId);

        // Clean up
        await deleteSavedQuery(savedObjectId);
      });

      it('copy returns 200 with copied fields and unique name', async () => {
        const id = `contract-copy-${Date.now()}`;
        const createResp = await createSavedQuery(id).expect(200);
        const savedObjectId = createResp.body.data.saved_object_id;

        const copyResponse = await supertest
          .post(`/api/osquery/saved_queries/${savedObjectId}/copy`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion)
          .expect(200);

        const { data } = copyResponse.body;
        expect(data).to.be.ok();
        expect(data.saved_object_id).to.be.a('string');
        expect(data.saved_object_id).to.not.be(savedObjectId);
        expect(data.id).to.contain('copy');
        expect(data.query).to.be('select 1;');
        expect(data.created_at).to.be.a('string');
        expect(data.created_by).to.be.a('string');

        // Clean up both
        await deleteSavedQuery(data.saved_object_id);
        await deleteSavedQuery(savedObjectId);
      });

      it('delete returns 200 and subsequent GET returns 404', async () => {
        const id = `contract-delete-${Date.now()}`;
        const createResp = await createSavedQuery(id).expect(200);
        const savedObjectId = createResp.body.data.saved_object_id;

        await deleteSavedQuery(savedObjectId).expect(200);

        await supertest
          .get(`/api/osquery/saved_queries/${savedObjectId}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion)
          .expect(404);
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
  });
}
