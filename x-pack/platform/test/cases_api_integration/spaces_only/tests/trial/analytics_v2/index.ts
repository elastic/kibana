/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { createSpaces, deleteSpaces } from '../../../../common/lib/authentication';
import { waitForCaseIndexExists } from './helpers';

/**
 * Cases-analytics v2 API integration suite.
 *
 * Runs only via `config_analytics_v2.ts` (which sets
 * `xpack.cases.analyticsV2.enabled=true`). Tests exercise the end-to-end
 * write path (cases SO → fire-and-forget writer → `.cases`), reconciliation,
 * per-space data view lazy bootstrap, the operator routes (`/state`,
 * `/reconcile/run_soon`, `/reset`), and a handful of regression scenarios
 * called out in PR review:
 *   - newly-created case picked up by reconciliation even when
 *     `updated_at` is `null` (filter OR-clause)
 *   - `/reset` clears task state so the follow-up tick walks every case
 *
 * Hidden-index ACL coverage (superuser-only) lives elsewhere — this config
 * runs with security disabled and can't enforce privileges. A separate
 * `security_and_spaces` config could pick that up later.
 */
export default ({ loadTestFile, getService }: FtrProviderContext): void => {
  describe('cases-analytics v2 (spaces_only, trial)', function () {
    this.tags('skipFIPS');

    before(async () => {
      await createSpaces(getService);
      // v2's plugin start runs `ensureCaseIndex` asynchronously after Kibana
      // boots. Wait for `.cases` to exist before any test fires, so the
      // first test isn't racing the bootstrap.
      await waitForCaseIndexExists(getService('es'));
    });

    after(async () => {
      await deleteSpaces(getService);
    });

    loadTestFile(require.resolve('./writer'));
    loadTestFile(require.resolve('./state'));
    loadTestFile(require.resolve('./reconcile'));
    loadTestFile(require.resolve('./reset'));
    loadTestFile(require.resolve('./per_space_data_views'));
  });
};
