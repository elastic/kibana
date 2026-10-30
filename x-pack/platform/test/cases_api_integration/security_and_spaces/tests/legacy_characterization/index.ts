/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../common/ftr_provider_context';

// Pins the per-solution Cases behavior that `xpack.cases.topLevelApp.enabled=false` and
// `xpack.cases.customStatuses.enabled=false` must keep restoring.
export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('cases legacy characterization', function () {
    loadTestFile(require.resolve('./rbac_matrix'));
    loadTestFile(require.resolve('./status_lifecycle'));
    loadTestFile(require.resolve('./attachment_acceptance'));
    loadTestFile(require.resolve('./custom_statuses_disabled'));
  });
};
