/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base, apiTest as apiBase, mergeTests } from '@kbn/scout';

import { extendPageObjects } from '../page_objects';
import { ObltApiServicesFixture, ObltTestFixtures, ObltWorkerFixtures } from './types';
import { profilingSetupFixture } from './worker/profiling/profiling_setup_fixture';
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
    async ({ apiServices }, use) => {
      // extend with Observability specific API services
      // apiServices.<service_name> = getServiceApiHelper(kbnClient);
      await use(apiServices);
    },
    { scope: 'worker' },
  ],
});

const apiFixture = apiBase.extend<ObltApiServicesFixture>({
  apiServices: [
    async ({ apiServices }, use) => {
      // extend with Observability specific API services
      // apiServices.<service_name> = getServiceApiHelper(kbnClient);
      await use(apiServices);
    },
    { scope: 'worker' },
  ],
});

export const apiTest = mergeTests(apiFixture, profilingSetupFixture);

/**
 * Should be used for the test spec files executed sequentially.
 */
export const test = mergeTests(baseFixture, sloDataFixture);
