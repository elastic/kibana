/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

/**
 * Gate A-data for the Isomer corpus: materializes each ES|QL metric and xy corpus panel against
 * the corpus's own data and compares the tables with Kibana's captured ones. Runs on demand only
 * (see README.md); it is listed under `disabled` in the FTR manifest so CI never runs it.
 */
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const apiConfig = await readConfigFile(require.resolve('../api_integration/config.ts'));

  return {
    ...apiConfig.getAll(),
    testFiles: [require.resolve('./apis')],
    junit: {
      reportName: 'Isomer Gate A-data',
    },
    kbnTestServer: {
      ...apiConfig.get('kbnTestServer'),
      serverArgs: [
        ...apiConfig.get('kbnTestServer.serverArgs'),
        '--feature_flags.overrides.isomer.materializeEnabled=true',
        '--uiSettings.overrides.dateFormat:tz=UTC',
      ],
    },
  };
}
