/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  // This folder contains OSS search tests.
  // The x-pack search tests (formerly `search_xpack`) have been migrated to Scout.
  describe('search', function () {
    this.tags(['esGate']);

    loadTestFile(require.resolve('./search'));
    // TODO: Removed `sql_search` since
    // SQL is not supported in Serverless
  });
}
