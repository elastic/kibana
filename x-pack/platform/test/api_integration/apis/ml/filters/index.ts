/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';

// TODO: Remove these FTR tests after verifying full coverage in Scout API tests
// See: x-pack/platform/plugins/shared/ml/test/scout/api/parallel_tests/filters/
// FTR tests have been migrated to Scout. These can be deleted once migration is complete.
// See related issue: https://github.com/elastic/kibana/issues/263529
export default function ({ loadTestFile }: FtrProviderContext) {
  describe('filters', function () {
    loadTestFile(require.resolve('./create_filters'));
    loadTestFile(require.resolve('./get_filters'));
    loadTestFile(require.resolve('./get_filters_stats'));
    loadTestFile(require.resolve('./delete_filters'));
    loadTestFile(require.resolve('./update_filters'));
  });
}
