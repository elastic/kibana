/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import { createCase, deleteAllCaseItems, getAuthWithSuperUser } from '../../../../common/lib/api';
import { CASE_INDEX, resetV2, waitForAnalyticsCase, waitForCaseIndexExists } from './helpers';

const INTERNAL_HEADERS = {
  'kbn-xsrf': 'true',
  'x-elastic-internal-origin': 'kibana',
} as const;

/**
 * `/reset` is the operator escape hatch. Tests assert the documented
 * orchestration: drop `.cases` → delete per-space data views → clear
 * reconciliation task state → recreate the index → trigger an immediate
 * reconciliation tick. Every step is verified independently.
 */
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const auth = getAuthWithSuperUser();

  describe('/reset', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
      await resetV2(supertest);
    });

    it('drops `.cases` and recreates it', async () => {
      // Pre-state: index has a doc.
      const created = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, auth);
      await waitForAnalyticsCase(es, created.id);

      // Reset.
      const response = await supertest
        .post('/internal/cases/_analyticsV2/reset')
        .set(INTERNAL_HEADERS)
        .expect(200);

      expect(response.body.reset).to.eql(CASE_INDEX);
      // Index should exist again (recreated by ensureCaseIndex).
      await waitForCaseIndexExists(es);
      const exists = await es.indices.exists({ index: CASE_INDEX });
      expect(exists).to.eql(true);
    });

    it('reports the number of per-space data views deleted', async () => {
      // Bootstrap the default-space data view by hitting any cases endpoint.
      // (Lazy bootstrap fires on the request handler context creation.)
      await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, auth);

      // Give the data-view ensure a moment to land. It's fire-and-forget
      // via the request handler context.
      let dataViewExists = false;
      for (let attempt = 0; attempt < 30 && !dataViewExists; attempt++) {
        const result = await es.search({
          index: '.kibana*',
          query: {
            bool: {
              filter: [
                { term: { type: 'index-pattern' } },
                { prefix: { 'index-pattern.title': '.cases' } },
              ],
            },
          },
          size: 1,
        });
        dataViewExists =
          result.hits.total !== undefined &&
          (typeof result.hits.total === 'number'
            ? result.hits.total > 0
            : result.hits.total.value > 0);
        if (!dataViewExists) await new Promise((r) => setTimeout(r, 200));
      }

      const response = await supertest
        .post('/internal/cases/_analyticsV2/reset')
        .set(INTERNAL_HEADERS)
        .expect(200);

      expect(response.body).to.have.property('data_views_deleted');
      // At least one — the default-space view from the createCase above.
      // (Concurrent test interleaving could in theory cause more, but
      // afterEach resets state so this test is the only one running here.)
      expect(response.body.data_views_deleted).to.be.greaterThan(0);
    });

    it('clears reconciliation task state so the follow-up tick walks every case', async () => {
      // Setup: create a case, run reconcile to seed the cursor.
      const oldCase = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest({ title: 'old case' }),
        200,
        auth
      );
      await waitForAnalyticsCase(es, oldCase.id);

      // Bump the cursor by running an explicit reconciliation.
      await supertest
        .post('/internal/cases/_analyticsV2/reconcile/run_soon')
        .set(INTERNAL_HEADERS)
        .expect(200);

      // Without /reset, the cursor would now be ahead of `oldCase.created_at`
      // (because the reconciliation tick advances `last_run_at` to
      // tickStartedAt). A naive "drop + reindex" would NOT pick up oldCase
      // because the runner's `updated_at > lastRunAt` filter would skip it.
      //
      // /reset clears the task state — the next tick has `lastRunAt:
      // undefined`, which the runner translates to "no filter, walk
      // everything". The pre-existing case should reappear in `.cases`
      // after reset.
      await supertest.post('/internal/cases/_analyticsV2/reset').set(INTERNAL_HEADERS).expect(200);

      await waitForAnalyticsCase(es, oldCase.id, { expect: 'present' });
    });

    it('reports reconciliation_scheduled with the task instance id', async () => {
      const response = await supertest
        .post('/internal/cases/_analyticsV2/reset')
        .set(INTERNAL_HEADERS)
        .expect(200);

      // `reconciliation_scheduled` is the task **instance** id, not the type.
      // The fix in commit 793bb6abac32 hinged on this distinction — keep
      // the assertion explicit so a regression flips the test red.
      expect(response.body.reconciliation_scheduled).to.eql('cases-analyticsV2-reconciliation');
    });
  });
};
