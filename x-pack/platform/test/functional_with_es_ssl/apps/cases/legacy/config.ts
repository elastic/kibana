/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

// Characterization of the per-solution Cases UI: both kill switches pinned off, re-running
// group 1 so the flags-off path keeps today's behavior.
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseConfig = await readConfigFile(require.resolve('../../../config.base.ts'));

  return {
    ...baseConfig.getAll(),
    testFiles: [require.resolve('.'), require.resolve('../group1')],
    kbnTestServer: {
      ...baseConfig.get('kbnTestServer'),
      serverArgs: [
        ...baseConfig.get('kbnTestServer.serverArgs'),
        '--xpack.cases.topLevelApp.enabled=false',
        '--xpack.cases.customStatuses.enabled=false',
      ],
    },
    junit: {
      reportName: 'Chrome X-Pack UI Functional Tests with ES SSL - Cases - legacy',
    },
  };
}
