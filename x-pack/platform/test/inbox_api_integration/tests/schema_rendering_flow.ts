/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';

/**
 * Wide-schema round-trip coverage — asserts that a workflow whose
 * `waitForInput.with.schema` declares every field type in
 * [security-team#16707](https://github.com/elastic/security-team/issues/16707)
 * (string / number / boolean / enum / array-of-enum, with titles,
 * descriptions, defaults, and required subsets) surfaces unchanged on the
 * `InboxAction.input_schema` field returned by `/internal/inbox/actions`.
 *
 * Skipped today for the same reason as the `inbox_flow.ts` live lifecycle:
 * we need a harness that can boot a real Workflows execution and poll for
 * `waiting_for_input` before the schema round-trip can be asserted.
 */
export default function (_ftr: FtrProviderContext) {
  describe.skip('Inbox schema rendering', () => {
    it('round-trips a wide JSON schema through the workflows provider', () => {
      // See describe-level comment for the expected implementation.
    });
  });
}
