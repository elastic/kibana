/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';

/**
 * Timeout/expiration coverage gates on Workflows shipping the configurable
 * `waitForInput.timeout` ([security-team#16708](https://github.com/elastic/security-team/issues/16708))
 * and the corresponding `step_executions` index columns
 * (kibana PR #256603). Once those merge, this suite needs to:
 *
 *  - Trigger a `waitForInput` step with a short timeout
 *  - Wait past the timeout
 *  - Assert the surfaced `InboxAction` reports `response_mode === 'timed_out'`
 *  - Assert a subsequent `respond` returns 4xx (the run already resolved)
 *
 * Skipped in CI today so we don't gate on yet-to-ship engine behavior; the
 * placeholder keeps the harness wired so adding the test is a one-file change.
 */

export default function (_ftr: FtrProviderContext) {
  describe.skip('Inbox timeout flow', () => {
    it('marks an action timed_out after waitForInput.timeout elapses', () => {
      // intentionally empty — see file-level comment
    });
  });
}
