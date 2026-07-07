/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { commonFunctionalServices } from '@kbn/ftr-common-functional-services';
import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import type { FtrConfigProviderContext } from '@kbn/test';
import path from 'node:path';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  // Read the Kibana API integration tests config file so that we can utilize its services.
  const kibanaAPITestsConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-src/api_integration/config')
  );
  const xPackApiTestsConfig = await readConfigFile(require.resolve('../api_integration/config.ts'));

  const esTestCluster = {
    ...xPackApiTestsConfig.get('esTestCluster'),
    dataArchive: path.resolve(__dirname, './fixtures/data_archives/reindex_service.zip'),
  };

  return {
    testConfigCategory: ScoutTestRunConfigCategory.API_TEST,
    testFiles: [require.resolve('./rest_api')],
    servers: xPackApiTestsConfig.get('servers'),
    services: {
      ...commonFunctionalServices,
      supertest: kibanaAPITestsConfig.get('services.supertest'),
    },
    junit: {
      reportName: 'X-Pack Reindex Service Integration Tests',
    },
    kbnTestServer: {
      ...xPackApiTestsConfig.get('kbnTestServer'),
      serverArgs: [...xPackApiTestsConfig.get('kbnTestServer.serverArgs')],
    },
    esTestCluster,
  };
}
