/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../functional/ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('access control saved objects', function () {
    loadTestFile(require.resolve('./default_state'));
    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./bulk_create'));
    loadTestFile(require.resolve('./update'));
    loadTestFile(require.resolve('./bulk_update'));
    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./bulk_delete'));
    loadTestFile(require.resolve('./change_ownership'));
    loadTestFile(require.resolve('./change_access_mode'));
  });
}
