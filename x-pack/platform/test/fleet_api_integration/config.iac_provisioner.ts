/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

import { IAC_PROVISIONER_MOCK_URL } from './apis/iac_provisioner/helpers/mock_iac_provisioner_api';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseFleetApiConfig = await readConfigFile(require.resolve('./config.base.ts'));
  const baseConfig = baseFleetApiConfig.getAll();

  return {
    ...baseConfig,
    testFiles: [require.resolve('./apis/iac_provisioner')],
    junit: {
      reportName: 'X-Pack Fleet IaC Provisioner API Integration Tests',
    },
    kbnTestServer: {
      ...baseConfig.kbnTestServer,
      serverArgs: [
        ...baseConfig.kbnTestServer.serverArgs,
        // The IaC Provisioner is gated on agentless being enabled, which in ESS needs a cloud id.
        `--xpack.cloud.id="ftr_fake_cloud_id:aGVsbG8uY29tOjQ0MyRFUzEyM2FiYyRrYm4xMjNhYmM="`,
        `--xpack.cloud.base_url="https://cloud.elastic.co"`,
        `--xpack.cloud.deployment_url="/deployments/deploymentId"`,
        // Point the IaC Provisioner client at the msw mock the suites start on this port.
        `--xpack.fleet.iacProvisioner.api.url=${IAC_PROVISIONER_MOCK_URL}`,
        `--feature_flags.overrides.fleet.enableIacProvisioner=true`,
      ],
    },
  };
}
