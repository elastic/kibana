/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xpackFunctionalConfig = await readConfigFile(
    require.resolve('../functional/config.base.ts')
  );

  return {
    ...xpackFunctionalConfig.getAll(),
    testFiles: [require.resolve('./tests')],
    junit: {
      reportName: 'X-Pack Agent Builder Functional Tests',
    },
    kbnTestServer: {
      ...xpackFunctionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...xpackFunctionalConfig.get('kbnTestServer.serverArgs'),
        '--uiSettings.overrides.agentBuilder:enabled=true',
        `--logging.loggers=${JSON.stringify([
          { name: 'plugins.onechat', level: 'debug', appenders: ['console'] },
        ])}`,
      ],
    },
  };
}
