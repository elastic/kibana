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
 * Should be used test spec files, running in parallel in isolated spaces against the same Kibana instance.
 *
 * Note: we deliberately do NOT merge in `profilingSetupFixture` here. That
 * fixture extends the non-space `test` from `@kbn/scout`, and merging it with
 * the space-aware base via Playwright's `mergeTests` uses last-write-wins
 * semantics for colliding fixtures — which silently replaces the space-aware
 * `page` with the default-space one, breaking any test that depends on the
 * per-worker isolated space (e.g. `scoutSpace.setSolutionView(...)`).
 * `profilingSetup` is only consumed from the single-thread `test`/`apiTest`
 * and the global setup hook, so it's not needed on `spaceTest`.
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
