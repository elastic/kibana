/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('Evals Endpoints', () => {
    loadTestFile(require.resolve('./scores'));
    loadTestFile(require.resolve('./experiments'));
    loadTestFile(require.resolve('./datasets'));
    loadTestFile(require.resolve('./traces'));
    loadTestFile(require.resolve('./evaluators'));
  });
}
