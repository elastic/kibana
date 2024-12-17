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
import { GisPage } from './page_objects';

export interface ExtendedScoutTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    gis: GisPage;
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
      gis: createLazyPageObject(GisPage, page),
    };

    await use(extendedPageObjects);
  },
});

// export * as testData from './constants';
// export * as assertionMessages from './assertion_messages';
