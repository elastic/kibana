/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base } from '@kbn/scout';
import type { ScoutPage, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { extendPageObjects, type ApiKeysPageObjects } from './page_objects';

export interface ApiKeysTestFixtures extends ScoutTestFixtures {
  pageObjects: ApiKeysPageObjects;
}

export const test = base.extend<ApiKeysTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: ApiKeysPageObjects;
      page: ScoutPage;
    },
    use: (pageObjects: ApiKeysPageObjects) => Promise<void>
  ) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
});
