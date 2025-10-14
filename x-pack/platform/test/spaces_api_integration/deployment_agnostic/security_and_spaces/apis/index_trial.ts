/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile, getService }: DeploymentAgnosticFtrProviderContext) {
  describe('spaces api with security', function () {
    loadTestFile(require.resolve('./resolve_copy_to_space_conflicts'));
    loadTestFile(require.resolve('./superuser/resolve_copy_to_space_conflicts'));
    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./superuser/create'));
    loadTestFile(require.resolve('./get_all'));
    loadTestFile(require.resolve('./superuser/get_all'));
    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./superuser/get'));
    loadTestFile(require.resolve('./update'));
    loadTestFile(require.resolve('./superuser/update'));
    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./superuser/delete'));
  });
}
