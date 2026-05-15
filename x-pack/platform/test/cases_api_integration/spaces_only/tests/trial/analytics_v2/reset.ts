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
import {
  CASE_INDEX,
  resetV2,
  runReconcileSoon,
  waitForAnalyticsCase,
  waitForCaseIndexExists,
} from './helpers';

const INTERNAL_HEADERS = {
  'kbn-xsrf': 'true',
  'x-elastic-internal-origin': 'kibana',
} as const;

/**
 * `/reset` is the administrator escape hatch. Synchronously drops
 * `.cases`, recreates it, deletes every per-space data view, clears
 * the data view bootstrap cache, and clears the reconciliation task's
 * persisted cursor so the next periodic tick (or
 * `/reconcile/run_soon`) walks every case from scratch.
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

    it('drops `.cases` and recreates it, returns 200 with the reset envelope', async () => {
      const created = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, auth);
      await waitForAnalyticsCase(es, created.id);

      const response = await supertest
        .post('/internal/cases/_analyticsV2/reset')
        .set(INTERNAL_HEADERS)
        .expect(200);

      expect(response.body.reset).to.eql(CASE_INDEX);
      expect(response.body).to.have.property('data_views_deleted');

      // The index exists again (recreated by the handler before the
      // response returned).
      await waitForCaseIndexExists(es);
      const exists = await es.indices.exists({ index: CASE_INDEX });
      expect(exists).to.eql(true);
    });

    it('reports the number of per-space data views deleted', async () => {
      // Bootstrap the default-space data view by hitting any cases
      // endpoint. Lazy bootstrap fires on request handler context
      // creation.
      await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, auth);

      // Give the data-view ensure a moment to land. It runs
      // fire-and-forget via the request handler context.
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
      // At least one — the default-space view from the createCase
      // above. Concurrent interleaving could cause more, but
      // afterEach resets state, so this test is the only one
      // running here.
      expect(response.body.data_views_deleted).to.be.greaterThan(0);
    });

    it('clears reconciliation task state so the follow-up backfill walks every case', async () => {
      // Create a case and run reconcile to seed the cursor.
      const oldCase = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest({ title: 'old case' }),
        200,
        auth
      );
      await waitForAnalyticsCase(es, oldCase.id);

      // Bump the cursor by running an explicit reconciliation.
      await runReconcileSoon(supertest);

      // Without `/reset`, the cursor would now be ahead of
      // `oldCase.created_at` and a periodic tick wouldn't re-emit
      // oldCase. `/reset` clears the cursor (`lastRunAt: undefined →
      // no filter → walk every case`), so the pre-existing case
      // lands in `.cases` again after the next reconciliation tick.
      await resetV2(supertest);
      await runReconcileSoon(supertest);

      await waitForAnalyticsCase(es, oldCase.id, { expect: 'present' });
    });
  });
};
