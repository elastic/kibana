/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';
import { ScoutTestRunConfigCategory } from '@kbn/scout-info';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.ts'));

  return {
    testConfigCategory: ScoutTestRunConfigCategory.API_TEST,
    testFiles: [require.resolve('./apis')],
    servers: xPackAPITestsConfig.get('servers'),
    services: xPackAPITestsConfig.get('services'),
    junit: {
      reportName: 'X-Pack Monitoring API Integration Tests',
    },
    esTestCluster: xPackAPITestsConfig.get('esTestCluster'),
    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        // This suite installs its package fixtures by upload, and their names
        // (kibana, logstash, ...) exist in the package registry. Fleet rejects
        // such uploads by default.
        '--xpack.fleet.internal.skipUploadPackageValidation=true',
      ],
    },
  };
}
