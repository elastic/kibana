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

  const baseServerArgs: string[] = baseConfig.kbnTestServer.serverArgs;
  const experimentalFeaturesArg = baseServerArgs.find((arg) =>
    arg.startsWith('--xpack.fleet.experimentalFeatures=')
  )!;
  const experimentalFeaturesValue = JSON.parse(
    experimentalFeaturesArg.replace('--xpack.fleet.experimentalFeatures=', '')
  );

  return {
    ...baseConfig,
    testFiles: [require.resolve('./apis/cloud_onboarding_deployment')],
    junit: {
      reportName: 'X-Pack Fleet Cloud Onboarding Deployment API Integration Tests',
    },
    kbnTestServer: {
      ...baseConfig.kbnTestServer,
      serverArgs: [
        ...baseServerArgs.filter((arg) => !arg.startsWith('--xpack.fleet.experimentalFeatures=')),
        `--xpack.fleet.experimentalFeatures=${JSON.stringify({
          ...experimentalFeaturesValue,
          enableCloudOnboardingDeployments: true,
        })}`,
      ],
    },
  };
}
