/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import type { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseIntegrationTestsConfig = await readConfigFile(require.resolve('../../config.ts'));
  const fixturePlugin = resolve(__dirname, '../../plugins/search_inference_endpoints_fixture');

  return {
    ...baseIntegrationTestsConfig.getAll(),
    testFiles: [require.resolve('.')],
    kbnTestServer: {
      ...baseIntegrationTestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...baseIntegrationTestsConfig.get('kbnTestServer.serverArgs'),
        `--plugin-path=${fixturePlugin}`,
      ],
    },
  };
}
