/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext, getKibanaCliLoggers } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../../config.base.ts'));

  const baseConfig = {
    ...functionalConfig.getAll(),
    testFiles: [require.resolve('.')],
  };

  baseConfig.kbnTestServer = {
    ...baseConfig.kbnTestServer,
    serverArgs: [
      ...baseConfig.kbnTestServer.serverArgs,
      `--logging.loggers=${JSON.stringify([
        ...getKibanaCliLoggers(functionalConfig.get('kbnTestServer.serverArgs')),
        {
          name: 'plugins.reporting',
          level: 'trace',
        },
        {
          name: 'plugins.screenshotting',
          level: 'trace',
        },
      ])}`,
    ],
  };

  return baseConfig;
}
