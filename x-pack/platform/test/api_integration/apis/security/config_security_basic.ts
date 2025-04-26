/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseIntegrationTestsConfig = await readConfigFile(require.resolve('../../config.ts'));
  // security APIs should function the same under a basic or trial license
  return {
    ...baseIntegrationTestsConfig.getAll(),
    testFiles: [require.resolve('./security_basic')],
    esTestCluster: {
      ...baseIntegrationTestsConfig.get('esTestCluster'),
      license: 'basic',
      serverArgs: [
        ...baseIntegrationTestsConfig.get('esTestCluster.serverArgs'),
        'xpack.license.self_generated.type=basic',
        'xpack.security.enabled=true',
        'xpack.security.authc.api_key.enabled=true',
      ],
    },
    junit: {
      reportName: 'X-Pack API Integration Tests (Security Basic)',
    },
  };
}
