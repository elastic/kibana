/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

const EXPERIMENTAL_FEATURES_ARG_PREFIX = '--xpack.fleet.experimentalFeatures=';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseFleetApiConfig = await readConfigFile(require.resolve('./config.base.ts'));
  const baseConfig = baseFleetApiConfig.getAll();
  const baseServerArgs: string[] = baseConfig.kbnTestServer.serverArgs;

  // The base config already passes --xpack.fleet.experimentalFeatures; passing the
  // flag twice would make Kibana parse it as an array and fail config validation,
  // so the base value is extended in place instead.
  const baseExperimentalArg = baseServerArgs.find((arg) =>
    arg.startsWith(EXPERIMENTAL_FEATURES_ARG_PREFIX)
  );
  const experimentalFeatures = {
    ...(baseExperimentalArg
      ? JSON.parse(baseExperimentalArg.slice(EXPERIMENTAL_FEATURES_ARG_PREFIX.length))
      : {}),
    disableAgentlessLegacyAPI: true,
  };

  return {
    ...baseConfig,
    testFiles: [require.resolve('./apis/agentless_legacy_disabled')],
    junit: {
      reportName: 'X-Pack Fleet Agentless Legacy API Disabled Integration Tests',
    },
    kbnTestServer: {
      ...baseConfig.kbnTestServer,
      serverArgs: [
        ...baseServerArgs.filter((arg) => !arg.startsWith(EXPERIMENTAL_FEATURES_ARG_PREFIX)),
        `${EXPERIMENTAL_FEATURES_ARG_PREFIX}${JSON.stringify(experimentalFeatures)}`,
        // Cloud configuration needed for agentless functionality in ESS (same as config.agentless.ts)
        `--xpack.cloud.id="ftr_fake_cloud_id:aGVsbG8uY29tOjQ0MyRFUzEyM2FiYyRrYm4xMjNhYmM="`,
        `--xpack.cloud.base_url="https://cloud.elastic.co"`,
        `--xpack.cloud.deployment_url="/deployments/deploymentId"`,
      ],
    },
  };
}
