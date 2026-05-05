/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest as spaceBase } from '@kbn/scout';
import { extendPageObjects } from '../page_objects';

import type { ObltParallelTestFixtures, ObltParallelWorkerFixtures } from './types';

/**
 * Does not merge `profilingSetupFixture`: it extends non-space `test`; `mergeTests`
 * would overwrite the space-scoped `page` and break `scoutSpace` isolation.
 * Profiling stays on single-thread `test` / `apiTest` / global setup.
 */
export const spaceTest = spaceBase.extend<ObltParallelTestFixtures, ObltParallelWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: ObltParallelTestFixtures['pageObjects'];
      page: ObltParallelTestFixtures['page'];
    },
    use: (pageObjects: ObltParallelTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
  apiServices: [
    async ({ apiServices }, use) => {
      // extend with Observability specific API services
      // apiServices.<service_name> = getServiceApiHelper(kbnClient);
      await use(apiServices);
    },
    { scope: 'worker' },
  ],
});
