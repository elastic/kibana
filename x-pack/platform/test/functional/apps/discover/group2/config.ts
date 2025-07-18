/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

/**
 * NOTE: The solution view is currently only available in the cloud environment.
 * This test suite fakes a cloud environement by setting the cloud.id and cloud.base_url
 */

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
<<<<<<<< HEAD:x-pack/test/functional_solution_sidenav/config.ts
  const functionalConfig = await readConfigFile(require.resolve('../functional/config.base.js'));
========
  const functionalConfig = await readConfigFile(require.resolve('../../../config.base.ts'));
>>>>>>>> 33e1e2f73f3 ([ska] relocate discover, dashboard, maps, status_page ui tests (#228541)):x-pack/platform/test/functional/apps/discover/group2/config.ts

  return {
    ...functionalConfig.getAll(),
    testFiles: [require.resolve('.')],
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [...functionalConfig.get('kbnTestServer.serverArgs')],
    },
  };
}
