/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ loadTestFile }: FtrProviderContext) {
  describe('saved objects tagging - functional tests', function () {
    loadTestFile(require.resolve('./listing'));
    loadTestFile(require.resolve('./bulk_actions'));
    loadTestFile(require.resolve('./bulk_assign'));
    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./edit'));
    loadTestFile(require.resolve('./som_integration'));
    loadTestFile(require.resolve('./discover_integration'));
  });
}
