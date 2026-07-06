/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('index_patterns', function () {
    this.tags(['esGate']);

    // Remaining FTR coverage. The rest of this suite has been migrated to Scout under
    // `src/platform/plugins/shared/data_views/test/scout/api/tests/`.
    loadTestFile(require.resolve('./es_errors'));
  });
}
