/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseConfig = await readConfigFile(require.resolve('../../../config.base.ts'));

  return {
    ...baseConfig.getAll(),
    testFiles: [require.resolve('.')],
    esTestCluster: {
      ...baseConfig.get('esTestCluster'),
      license: 'basic',
      serverArgs: ['xpack.license.self_generated.type=basic'],
    },
    junit: {
      reportName: 'Chrome X-Pack UI Functional Tests with ES SSL - Cases - basic license',
    },
  };
}
