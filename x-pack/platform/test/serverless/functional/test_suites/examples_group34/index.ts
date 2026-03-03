/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Serverless Common UI - Examples Group 34', function () {
    this.tags(['skipMKI', 'esGate']);

    loadTestFile(require.resolve('../examples/search'));
    loadTestFile(require.resolve('../examples/search_examples'));
    loadTestFile(require.resolve('../examples/unified_field_list_examples'));
  });
}
