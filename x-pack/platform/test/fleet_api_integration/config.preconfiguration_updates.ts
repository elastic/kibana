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
    testFiles: [require.resolve('./apis/preconfiguration_updates')],
    junit: {
      reportName: 'X-Pack Fleet Preconfiguration Updates API Integration Tests',
    },
    kbnTestServer: {
      ...baseConfig.kbnTestServer,
      serverArgs: [
        ...baseConfig.kbnTestServer.serverArgs,
        // Cloud (non-serverless) config so isAgentlessEnabled() resolves to true, which is
        // required for Fleet to preconfigure the ECH agentless output (es-agentless-output).
        // xpack.fleet.agentless.enabled is already set to true in config.base.ts.
        `--xpack.cloud.id="ftr_fake_cloud_id:aGVsbG8uY29tOjQ0MyRFUzEyM2FiYyRrYm4xMjNhYmM="`,
        `--xpack.cloud.base_url="https://cloud.elastic.co"`,
        `--xpack.cloud.deployment_url="/deployments/deploymentId"`,
        // Preconfigure the default ES output the same way a real deployment does, via
        // xpack.fleet.agents.elasticsearch.hosts. This is what causes Fleet to create
        // `fleet-default-output` with `is_preconfigured: true` and (pre-#276418) no
        // `allow_edit`, reproducing the bug where its connection fields could not be
        // updated via the API even though tooling legitimately needs to rewrite them.
        `--xpack.fleet.agents.elasticsearch.hosts=${JSON.stringify(['https://localhost:9200'])}`,
        // Preconfigure a default fleet server host via xpack.fleet.fleetServerHosts with
        // no allow_edit, reproducing the bug fixed in #276363 where Fleet could not unset
        // `is_default` on the existing preconfigured default host when a new default was
        // set via the API.
        `--xpack.fleet.fleetServerHosts=${JSON.stringify([
          {
            id: 'preconfigured-default-fleet-server',
            name: 'Preconfigured default Fleet Server',
            is_default: true,
            host_urls: ['https://preconfigured.fleet.example.com:8220'],
          },
        ])}`,
      ],
    },
  };
}
