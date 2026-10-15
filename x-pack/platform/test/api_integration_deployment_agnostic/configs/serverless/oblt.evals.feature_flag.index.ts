/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('Evals APIs', function () {
    // --xpack.evals.enabled (from the serverless config) only applies to a locally-started FTR
    // Kibana; MKI runs against an existing project. Skip until evals is enabled by default on the
    // serverless projects this job targets.
    this.tags(['skipMKI']);
    loadTestFile(require.resolve('../../apis/evals'));
  });
}
