/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseFleetApiConfig = await readConfigFile(require.resolve('./config.base.ts'));

  const serverArgs: string[] = [...baseFleetApiConfig.get('kbnTestServer.serverArgs')];

  // Specifically enable space awareness for this config.
  const experimentalFeaturesIndex = serverArgs.findIndex((val) =>
    val.includes('xpack.fleet.experimentalFeatures')
  );
  serverArgs[experimentalFeaturesIndex] = `--xpack.fleet.experimentalFeatures=${JSON.stringify({
    useSpaceAwareness: true,
  })}`;

  return {
    ...baseFleetApiConfig.getAll(),
    kbnTestServer: {
      ...baseFleetApiConfig.get('kbnTestServer'),
      serverArgs,
    },
    testFiles: [require.resolve('./apis/space_awareness')],
    junit: {
      reportName: 'X-Pack Fleet Agent Policy API Integration Tests',
    },
  };
}
