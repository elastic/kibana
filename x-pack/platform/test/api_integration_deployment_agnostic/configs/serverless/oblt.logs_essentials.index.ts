/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('Serverless Observability Logs Essentials - Deployment-agnostic platform API integration tests', function () {
    this.tags(['esGate']);

    // load new oblt and platform deployment-agnostic test here
    // Note: if your tests runtime is over 5 minutes, create a new index and config file
    loadTestFile(require.resolve('../../apis/core'));
  });
}
