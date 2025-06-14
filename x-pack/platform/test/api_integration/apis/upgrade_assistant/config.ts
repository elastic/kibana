/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseIntegrationTestsConfig = await readConfigFile(require.resolve('../../config.ts'));

  return {
    ...baseIntegrationTestsConfig.getAll(),
    testFiles: [require.resolve('.')],
    kbnTestServer: {
      ...baseIntegrationTestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...baseIntegrationTestsConfig.get('kbnTestServer.serverArgs'),
        '--xpack.upgrade_assistant.featureSet.mlSnapshots=true',
        '--xpack.upgrade_assistant.featureSet.migrateSystemIndices=true',
        '--xpack.upgrade_assistant.featureSet.migrateDataStreams=true',
        '--xpack.upgrade_assistant.featureSet.reindexCorrectiveActions=true',
      ],
    },
  };
}
