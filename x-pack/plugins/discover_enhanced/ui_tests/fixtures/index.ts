/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  test as base,
  PageObjects,
  createLazyPageObject,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
} from '@kbn/scout';
import { DemoPage } from './page_objects';

interface ExtendedScoutTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    demo: DemoPage;
  };
}

export const test = base.extend<ExtendedScoutTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: ExtendedScoutTestFixtures['pageObjects'];
      page: ExtendedScoutTestFixtures['page'];
    },
    use: (pageObjects: ExtendedScoutTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      demo: createLazyPageObject(DemoPage, page),
    };

    await use(extendedPageObjects);
  },
});
