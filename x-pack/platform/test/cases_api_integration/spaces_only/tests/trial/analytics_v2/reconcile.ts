/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import { createCase, deleteAllCaseItems, getAuthWithSuperUser } from '../../../../common/lib/api';
import { resetV2, runReconcileSoon, waitForAnalyticsCase } from './helpers';

/**
 * Reconciliation tests focus on the **durability backstop** behaviour: every
 * case SO should land in `.cases` eventually, even when the real-time writer
 * misses one. Critical regression scenarios:
 *   - case with `updated_at: null` (newly created, writer dropped the
 *     update) — the filter's OR-clause must surface it via `created_at`.
 *   - `/reconcile/run_soon` causes a fresh tick to fire and the dropped
 *     case to land in `.cases` within seconds.
 */
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const auth = getAuthWithSuperUser();

  describe('reconciliation', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
      await resetV2(supertest);
    });

    it('runSoon picks up a case that was dropped from `.cases` out-of-band', async () => {
      // Simulate the "writer missed a write" scenario: create the case, let
      // the writer succeed, then delete the analytics doc directly via ES
      // (mimicking the post-write blip that reconciliation exists to
      // repair). The next tick should re-emit it.
      const created = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, auth);
      await waitForAnalyticsCase(es, created.id);

      await es.delete({ index: '.cases', id: created.id });
      await waitForAnalyticsCase(es, created.id, { expect: 'absent' });

      await runReconcileSoon(supertest);
      await waitForAnalyticsCase(es, created.id, { expect: 'present' });
    });

    it('runSoon picks up a newly-created case whose updated_at is null (regression)', async () => {
      // Direct regression coverage for the filter OR-clause. The cases SO
      // is created with `updated_at: null` (transformNewCase). A
      // pre-OR-clause filter (`updated_at > lastRunAt`) would never see
      // it; the post-fix filter (`updated_at > lastRunAt OR
      // (updated_at IS MISSING AND created_at > lastRunAt)`) does.
      //
      // Setup: create the case, drop its analytics doc, then force the
      // task state to a `last_run_at` BEFORE the case's `created_at` (a
      // /reset clears state to undefined → first run walks everything).
      // With state cleared, the filter is `undefined` and walks every
      // case anyway. To pin down the OR-clause specifically, we need to
      // seed task state with a `last_run_at`. We do that by running
      // reconcile once after creating the case, then deleting the doc,
      // then re-running — the task's cursor is now set to a recent
      // tickStartedAt, and the case has `updated_at: null` still
      // (because no one patched it).
      const created = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, auth);
      await waitForAnalyticsCase(es, created.id);

      // First reconciliation: writes the cursor to "now".
      await runReconcileSoon(supertest);
      // Drop the analytics doc; case SO still has updated_at: null.
      await es.delete({ index: '.cases', id: created.id });
      await waitForAnalyticsCase(es, created.id, { expect: 'absent' });

      // Second reconciliation: the cursor is now past `tickStartedAt` of
      // the first run, which is AFTER the case's created_at. The
      // updated_at-only filter would miss this case. The OR-clause
      // catches it because `updated_at IS NULL AND created_at > cursor`
      // is false (created_at < cursor)... wait, this fixture doesn't
      // actually hit the regression scenario — the cursor advanced past
      // both timestamps. To actually hit it, we need a case whose
      // created_at is AFTER the cursor was set.
      //
      // Approach: bump the cursor by running reconcile, THEN create the
      // case (so created_at > cursor), THEN drop the analytics doc,
      // THEN reconcile again. Implemented below.
      await deleteAllCaseItems(es);
      await resetV2(supertest);

      // (1) Seed cursor.
      await runReconcileSoon(supertest);
      // (2) Create a case whose created_at is after the seeded cursor.
      const newCase = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, auth);
      await waitForAnalyticsCase(es, newCase.id);
      // (3) Drop the analytics doc — SO retains updated_at: null.
      await es.delete({ index: '.cases', id: newCase.id });
      await waitForAnalyticsCase(es, newCase.id, { expect: 'absent' });
      // (4) Reconcile. The OR-clause must surface the case.
      await runReconcileSoon(supertest);
      await waitForAnalyticsCase(es, newCase.id, { expect: 'present' });
    });

    it('runSoon picks up a case patched since the last cursor', async () => {
      // The classic update path: case exists, gets patched, the writer
      // missed the patch, reconciliation re-emits with the updated values.
      //
      // We simulate "writer missed it" by dropping the analytics doc.
      // After a patch the SO's `updated_at` advances, so the regular
      // `updated_at > lastRunAt` clause catches it.
      const created = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, auth);
      await waitForAnalyticsCase(es, created.id);

      // Seed the cursor.
      await runReconcileSoon(supertest);

      // Patch the case (this also fires the writer; we drop the resulting
      // doc to model the writer missing the patch).
      await supertestWithoutAuth
        .patch('/api/cases')
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'kibana')
        .send({
          cases: [{ id: created.id, version: created.version, title: 'patched title' }],
        })
        .expect(200);

      await es.delete({ index: '.cases', id: created.id });
      await waitForAnalyticsCase(es, created.id, { expect: 'absent' });

      await runReconcileSoon(supertest);
      await waitForAnalyticsCase(es, created.id, { expect: 'present' });
    });
  });
};
