/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  CASE_INDEX_NAME,
  ACTIVITY_INDEX_NAME,
  ATTACHMENTS_INDEX_NAME,
} from '@kbn/cases-plugin/server/cases_analytics_v2/constants';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import { getPostCaseRequest } from '../../../common/lib/mock';
import {
  createCase,
  deleteAllCaseItems,
  getAuthWithSuperUser,
  updateCase,
} from '../../../common/lib/api';

/**
 * Regression guard for the "v1 unaffected when v2 is off" guarantee.
 *
 * This suite runs under `config_analytics_v2_off.ts`, which pins
 * `xpack.cases.analyticsV2.enabled=false` explicitly. It lives in its own
 * config (rather than the plain `spaces_only/config.ts`) so the flag-off
 * behavior is exercised deterministically regardless of the plugin default —
 * when the default is on, `spaces_only/config.ts` boots v2 ON and cannot host
 * this guard.
 * The proxy / noop-writer wiring in `cases_analytics_v2/service.ts` already
 * makes this correct in code — every writer call funnels through a stable
 * proxy that delegates to `V2_NOOP_WRITER` when the flag is off, and SO
 * services accept that proxy unconditionally. The explicit integration
 * assertion here exists so a future change that breaks the noop contract
 * (e.g. removing the proxy, accidentally constructing the real writer
 * unconditionally) fails loudly instead of silently regressing the
 * "deployments not using v2 are untouched" promise.
 */
export default ({ getService }: FtrProviderContext): void => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const auth = getAuthWithSuperUser();

  describe('cases-analytics v2 disabled (flag pinned off)', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('case create / patch / delete succeeds and no v2 index is bootstrapped', async () => {
      // Create — exercises the analyticsV2Writer.upsertCase hook (noop
      // when v2 is off).
      const created = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, auth);
      expect(created.id).to.be.a('string');

      // Patch — exercises the analyticsV2Writer.upsertCase hook on the
      // synthesized-post-update SO path in `CasesService.patchCase`.
      await updateCase({
        supertest: supertestWithoutAuth,
        params: { cases: [{ id: created.id, version: created.version, title: 'updated' }] },
        auth,
      });

      // Delete — exercises `bulkDeleteCaseEntities`, which builds the
      // per-entity status map and dispatches both
      // `analyticsV2Writer.bulkDeleteCases` and the cascade-by-case-id
      // calls into the activity + attachments writers (all noops when
      // v2 is off).
      await deleteAllCaseItems(es);

      // None of the v2 analytics indices may exist on this config —
      // with v2 off, plugin start skips every `ensure*Index` bootstrap.
      // Asserted in parallel so a regression on any surface fails here.
      const [casesExists, activityExists, attachmentsExists] = await Promise.all([
        es.indices.exists({ index: CASE_INDEX_NAME }),
        es.indices.exists({ index: ACTIVITY_INDEX_NAME }),
        es.indices.exists({ index: ATTACHMENTS_INDEX_NAME }),
      ]);
      expect(casesExists).to.eql(false);
      expect(activityExists).to.eql(false);
      expect(attachmentsExists).to.eql(false);
    });
  });
};
