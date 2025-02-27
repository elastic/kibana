/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest as spaceBase } from '@kbn/scout';

import { extendPageObjects } from '../page_objects';
import { ObltParallelTestFixtures, ObltParallelWorkerFixtures } from './types';

/**
 * Should be used test spec files, running in parallel in isolated spaces agaist the same Kibana instance.
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
});
