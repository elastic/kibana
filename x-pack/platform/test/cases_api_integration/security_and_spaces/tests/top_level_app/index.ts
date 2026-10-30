/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../common/ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('cases top-level app', function () {
    loadTestFile(require.resolve('./cases_v4_rbac'));
    // Legacy roles that were never re-saved keep their solution scope on the server: a deprecated
    // privilege borrows only the UI actions of its casesV4 replacement.
    loadTestFile(require.resolve('../legacy_characterization/rbac_matrix'));
  });
};
