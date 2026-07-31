/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseFleetApiConfig = await readConfigFile(require.resolve('./config.base.ts'));
  const baseConfig = baseFleetApiConfig.getAll();

  return {
    ...baseConfig,
    testFiles: [require.resolve('./apis/managed_inputs')],
    junit: {
      reportName: 'X-Pack Fleet Managed Inputs API Integration Tests',
    },
    kbnTestServer: {
      ...baseConfig.kbnTestServer,
      serverArgs: [
        ...baseConfig.kbnTestServer.serverArgs,
        // Add cloud configuration specifically for agent tests (needed for agentless functionality in ESS)
        `--xpack.cloud.id="ftr_fake_cloud_id:aGVsbG8uY29tOjQ0MyRFUzEyM2FiYyRrYm4xMjNhYmM="`,
        `--xpack.cloud.base_url="https://cloud.elastic.co"`,
        `--xpack.cloud.deployment_url="/deployments/deploymentId"`,
        // Managed inputs: managed bulk (agentless) today, managed OTLP output (any policy) in
        // a future addition to this same config.
        `--xpack.fleet.agentless.managedBulk.enabled=true`,
        `--xpack.cloud.managed_otlp.url=https://managed-otlp.ftr-test.invalid`,
      ],
    },
  };
}
