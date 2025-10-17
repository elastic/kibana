/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalCloudConfig = await readConfigFile(require.resolve('./config.ts'));

  const currentDate = new Date(Date.now());
  const trialEndDate = new Date(currentDate);

  // Set trial end date to one month in the future
  trialEndDate.setMonth(trialEndDate.getMonth() + 1);

  return {
    ...functionalCloudConfig.getAll(),
    testFiles: [require.resolve('./tests/trial_product_intercepts.ts')],
    kbnTestServer: {
      ...functionalCloudConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalCloudConfig.get('kbnTestServer.serverArgs'),
        // Set a trial end date for testing
        `--xpack.cloud.trial_end_date=${trialEndDate.toISOString()}`,
        '--xpack.product_intercept.enabled=true',
        // Use a shorter interval for testing purposes
        '--xpack.product_intercept.trialInterceptInterval=10s',
      ],
    },
  };
}
