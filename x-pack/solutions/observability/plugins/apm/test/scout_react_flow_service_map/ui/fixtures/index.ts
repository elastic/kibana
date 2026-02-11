/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ObltPageObjects,
  ObltTestFixtures,
  ObltWorkerFixtures,
  KibanaUrl,
} from '@kbn/scout-oblt';
import { test as base, createLazyPageObject } from '@kbn/scout-oblt';
import { ReactFlowServiceMapPage } from './page_objects/react_flow_service_map';
import { START_DATE, END_DATE } from './constants';

export const testData = {
  START_DATE,
  END_DATE,
};

export interface ReactFlowTestFixtures extends ObltTestFixtures {
  pageObjects: ObltPageObjects & {
    reactFlowServiceMapPage: ReactFlowServiceMapPage;
  };
}

export const test = base.extend<ReactFlowTestFixtures, ObltWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
      kbnUrl,
    }: {
      pageObjects: ReactFlowTestFixtures['pageObjects'];
      page: ReactFlowTestFixtures['page'];
      kbnUrl: KibanaUrl;
    },
    use: (pageObjects: ReactFlowTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      reactFlowServiceMapPage: createLazyPageObject(ReactFlowServiceMapPage, page, kbnUrl),
    };

    await use(extendedPageObjects);
  },
});
