/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';

// The remaining tabs live in the Scout suite at
// `x-pack/platform/plugins/shared/index_management/test/scout/ui`.
export default ({ loadTestFile }: FtrProviderContext) => {
  describe('Index Management', function () {
    loadTestFile(require.resolve('./indices'));
    loadTestFile(require.resolve('./index_detail'));
  });
};
