/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const emailEnabledServices = ['google-mail', 'amazon-ses'];

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseConfig = await readConfigFile(require.resolve('../../../../config.base.ts'));

  return {
    ...baseConfig.getAll(),
    testFiles: [require.resolve('.')],
    junit: {
      reportName:
        'Chrome X-Pack UI Functional Tests with ES SSL - Email services enabled Kibana config',
    },
    kbnTestServer: {
      ...baseConfig.getAll().kbnTestServer,
      serverArgs: [
        ...baseConfig.getAll().kbnTestServer.serverArgs,
        `--xpack.actions.email.services.enabled=${JSON.stringify(emailEnabledServices)}`,
      ],
    },
  };
}
