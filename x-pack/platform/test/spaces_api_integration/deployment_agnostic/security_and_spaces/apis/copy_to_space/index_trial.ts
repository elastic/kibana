/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile, getService }: DeploymentAgnosticFtrProviderContext) {
  describe('spaces api with security', function () {
    loadTestFile(require.resolve('./copy_to_space.common'));
  });
}
