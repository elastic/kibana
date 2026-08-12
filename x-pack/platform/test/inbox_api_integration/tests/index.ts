/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('inbox', function inboxApiIntegrationSuite() {
    loadTestFile(require.resolve('./inbox_flow'));
    loadTestFile(require.resolve('./schema_rendering_flow'));
    loadTestFile(require.resolve('./timeout_flow'));
  });
}
