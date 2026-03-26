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
