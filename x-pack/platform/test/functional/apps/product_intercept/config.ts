/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../../config.base.ts'));

  const baseConfig = functionalConfig.getAll();

  return {
    ...baseConfig,
    testFiles: [require.resolve('.')],
    kbnTestServer: {
      ...baseConfig.kbnTestServer,
      serverArgs: [
        ...baseConfig.kbnTestServer.serverArgs,
        `--xpack.product_intercept.enabled=true`,
        // Use a shorter interval for testing purposes
        `--xpack.product_intercept.interval=10s`,
      ],
    },
  };
}
