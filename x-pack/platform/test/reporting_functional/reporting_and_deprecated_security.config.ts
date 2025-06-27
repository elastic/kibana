/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { resolve } from 'path';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const reportingConfig = await readConfigFile(require.resolve('./reporting_and_security.config'));

  return {
    ...reportingConfig.getAll(),
    junit: { reportName: 'X-Pack Reporting Functional Tests With Deprecated Roles config' },
    testFiles: [resolve(__dirname, './reporting_and_deprecated_security')],
    kbnTestServer: {
      ...reportingConfig.get('kbnTestServer'),
      serverArgs: [
        ...reportingConfig.get('kbnTestServer.serverArgs'),
        `--xpack.reporting.roles.enabled=true`, // DEPRECATED: support for `true` will be removed in 8.0
      ],
    },
  };
}
