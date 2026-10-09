/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseConfig = await readConfigFile(require.resolve('../../../config.base.ts'));

  return {
    ...baseConfig.getAll(),
    testFiles: [require.resolve('.')],
    kbnTestServer: {
      ...baseConfig.get('kbnTestServer'),
      serverArgs: [
        ...baseConfig.get('kbnTestServer.serverArgs'),
        // Pin the templates flag ON explicitly so this suite is deterministic
        // regardless of the plugin default. The flag-OFF legacy counterpart runs
        // under `config_legacy.ts`.
        '--xpack.cases.templates.enabled=true',
      ],
    },
    junit: {
      reportName: 'Chrome X-Pack UI Functional Tests with ES SSL - Cases - group 2',
    },
  };
}
