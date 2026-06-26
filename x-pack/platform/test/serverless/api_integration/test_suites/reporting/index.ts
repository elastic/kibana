/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext) => {
  describe('Reporting', function () {
    this.tags(['esGate']);

    loadTestFile(require.resolve('./management'));
    loadTestFile(require.resolve('./generate_csv_searchsource')); // Uses deprecated API
    loadTestFile(require.resolve('./csv_v2_esql')); // Uses locator params with ESQL
    loadTestFile(require.resolve('./generate_csv_v2')); // Uses raw locator params without saved search
    loadTestFile(require.resolve('./datastream'));
  });
};
