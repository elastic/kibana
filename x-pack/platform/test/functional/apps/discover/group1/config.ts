/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
<<<<<<<< HEAD:x-pack/platform/test/functional/apps/discover/config.ts
  const functionalConfig = await readConfigFile(require.resolve('../../config.base.js'));
========
  const functionalConfig = await readConfigFile(require.resolve('../../../config.base.ts'));
>>>>>>>> 33e1e2f73f3 ([ska] relocate discover, dashboard, maps, status_page ui tests (#228541)):x-pack/platform/test/functional/apps/discover/group1/config.ts

  return {
    ...functionalConfig.getAll(),
    testFiles: [require.resolve('.')],
  };
}
