/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import {
  createCase,
  updateCase,
  deleteAllCaseItems,
  getAuthWithSuperUser,
} from '../../../../common/lib/api';
import {
  getAnalyticsCase,
  resetV2,
  waitForAnalyticsCase,
  waitForAnalyticsCaseUpdate,
} from './helpers';

/**
 * End-to-end coverage of the fire-and-forget write path:
 *
 *     cases SO mutation → CasesService hook → CasesAnalyticsV2Writer → .cases
 *
 * Tests assert the analytics doc appears, reflects updates, and is removed on
 * delete — the round-trip unit tests can't cover ES index semantics, doc
 * refresh timing, or the strict mapping accepting the doc shape.
 */
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const auth = getAuthWithSuperUser();

  describe('writer ES round-trip', () => {
    afterEach(async () => {
      // Clean SOs first, then reset the analytics surface — reset's
      // follow-up reconciliation has nothing to find that way.
      await deleteAllCaseItems(es);
      await resetV2(supertest);
    });

    it('createCase → analytics doc lands in .cases with the correct shape', async () => {
      const created = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, auth);

      await waitForAnalyticsCase(es, created.id);
      const doc = await getAnalyticsCase(es, created.id);

      expect(doc.cases.id).to.eql(created.id);
      expect(doc.cases.title).to.eql(created.title);
      // Doc-builder converts numeric SO enums to human strings.
      expect(doc.cases.status).to.eql('open');
      expect(doc.cases.severity).to.eql('low');
      // Envelope fields are populated from SO namespaces.
      expect(doc.kibana.space_ids).to.eql(['default']);
    });

    it('updateCase → analytics doc is upserted (single doc, latest values)', async () => {
      const created = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, auth);
      await waitForAnalyticsCase(es, created.id);

      await updateCase({
        supertest: supertestWithoutAuth,
        params: {
          cases: [{ id: created.id, version: created.version, title: 'updated title' }],
        },
        auth,
      });

      await waitForAnalyticsCaseUpdate(
        es,
        created.id,
        (source) => source.cases.title === 'updated title'
      );

      // Confirm it's still a single doc, not two — the writer is supposed to
      // upsert on the same `_id`.
      await es.indices.refresh({ index: '.cases' });
      const countResult = await es.count({ index: '.cases', q: `cases.id:"${created.id}"` });
      expect(countResult.count).to.eql(1);
    });

    it('deleteCase → analytics doc removed', async () => {
      const created = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, auth);
      await waitForAnalyticsCase(es, created.id);

      await supertestWithoutAuth
        .delete(`/api/cases?ids=${encodeURIComponent(JSON.stringify([created.id]))}`)
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'kibana')
        .expect(204);

      await waitForAnalyticsCase(es, created.id, { expect: 'absent' });
    });

    it('deleting an already-deleted case is a no-op', async () => {
      // The writer's `doDeleteCase` swallows 404s — re-issuing a delete
      // shouldn't produce an error or log noise.
      const created = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, auth);
      await waitForAnalyticsCase(es, created.id);

      const url = `/api/cases?ids=${encodeURIComponent(JSON.stringify([created.id]))}`;
      await supertestWithoutAuth
        .delete(url)
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'kibana')
        .expect(204);

      await waitForAnalyticsCase(es, created.id, { expect: 'absent' });

      // Second delete: SO already gone, returns 204. The writer fires
      // again (per-batch behaviour), hits 404 on `.cases`, swallows it.
      // Just assert the API call still succeeds.
      await supertestWithoutAuth
        .delete(url)
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'kibana')
        .expect(204);
    });
  });
};
