/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function loadTests({ loadTestFile }: FtrProviderContext) {
  describe('Managed Inputs', () => {
    loadTestFile(require.resolve('./managed_bulk_output'));
  });
}
