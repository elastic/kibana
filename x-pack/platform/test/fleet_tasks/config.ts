/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.ts'));

  return {
    testFiles: [require.resolve('./tests')],
    testConfigCategory: xPackAPITestsConfig.get('testConfigCategory'),
    servers: xPackAPITestsConfig.get('servers'),
    services: xPackAPITestsConfig.get('services'),
    junit: {
      reportName: 'X-Pack Fleet tasks tests',
    },
    esTestCluster: xPackAPITestsConfig.get('esTestCluster'),
    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        '--xpack.cloudSecurityPosture.enabled=true',
        // Enable debug fleet logs by default
        `--logging.loggers[0].name=plugins.fleet`,
        `--logging.loggers[0].level=debug`,
        `--logging.loggers[0].appenders=${JSON.stringify(['default'])}`,
        `--xpack.fleet.autoUpgrades.taskInterval=30s`,
        `--xpack.fleet.autoUpgrades.retryDelays=${JSON.stringify(['1m'])}`,
        `--xpack.fleet.versionSpecificPolicyAssignment.taskInterval=30s`,
        `--xpack.fleet.enableExperimental=${JSON.stringify(['enableVersionSpecificPolicies'])}`,
      ],
    },
  };
}
