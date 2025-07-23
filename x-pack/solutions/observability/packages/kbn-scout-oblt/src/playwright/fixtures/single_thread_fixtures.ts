/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base, mergeTests } from '@kbn/scout';
import type { ApiServicesFixture, KbnClient } from '@kbn/scout';

import { extendPageObjects } from '../page_objects';
import { ObltApiServicesFixture, ObltTestFixtures, ObltWorkerFixtures } from './types';
import { sloDataFixture } from './worker';

const baseFixture = base.extend<ObltTestFixtures, ObltWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: ObltTestFixtures['pageObjects'];
      page: ObltTestFixtures['page'];
    },
    use: (pageObjects: ObltTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
  apiServices: [
    async (
      { apiServices, kbnClient }: { apiServices: ApiServicesFixture; kbnClient: KbnClient },
      use: (extendedApiServices: ObltApiServicesFixture) => Promise<void>
    ) => {
      const extendedApiServices = apiServices as ObltApiServicesFixture;
      // extend with Observability specific API services
      // extendedApiServices.<service_name> = getServiceApiHelper(kbnClient);

      await use(extendedApiServices);
    },
    { scope: 'worker' },
  ],
});
/**
 * Should be used for the test spec files executed sequentially.
 */
export const test = mergeTests(baseFixture, sloDataFixture);
