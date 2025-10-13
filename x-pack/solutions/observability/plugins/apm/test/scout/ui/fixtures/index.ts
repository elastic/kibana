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
  BrowserAuthFixture,
} from '@kbn/scout-oblt';
import { test as base, createLazyPageObject } from '@kbn/scout-oblt';
import { ServiceMapPage } from './page_objects/service_map';
import { ServiceInventoryPage } from './page_objects/service_inventory';
import { StorageExplorerPage } from './page_objects/storage_explorer';
import { ServiceGroupsPage } from './page_objects/service_groups';
import { APM_ROLES } from './constants';

export interface ApmBrowserAuthFixture extends BrowserAuthFixture {
  loginAsApmAllPrivilegesWithoutWriteSettings: () => Promise<void>;
  loginAsApmReadPrivilegesWithWriteSettings: () => Promise<void>;
  loginAsApmMonitor: () => Promise<void>;
}

export interface ExtendedScoutTestFixtures extends ObltTestFixtures {
  pageObjects: ObltPageObjects & {
    serviceMapPage: ServiceMapPage;
    serviceInventoryPage: ServiceInventoryPage;
    storageExplorerPage: StorageExplorerPage;
    serviceGroupsPage: ServiceGroupsPage;
  };
  browserAuth: ApmBrowserAuthFixture;
}

export const test = base.extend<ExtendedScoutTestFixtures, ObltWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
      kbnUrl,
    }: {
      pageObjects: ExtendedScoutTestFixtures['pageObjects'];
      page: ExtendedScoutTestFixtures['page'];
      kbnUrl: KibanaUrl;
    },
    use: (pageObjects: ExtendedScoutTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      serviceMapPage: createLazyPageObject(ServiceMapPage, page, kbnUrl),
      serviceInventoryPage: createLazyPageObject(ServiceInventoryPage, page, kbnUrl),
      storageExplorerPage: createLazyPageObject(StorageExplorerPage, page, kbnUrl),
      serviceGroupsPage: createLazyPageObject(ServiceGroupsPage, page, kbnUrl),
    };

    await use(extendedPageObjects);
  },
  browserAuth: async (
    { browserAuth }: { browserAuth: BrowserAuthFixture },
    use: (browserAuth: ApmBrowserAuthFixture) => Promise<void>
  ) => {
    const loginAsApmAllPrivilegesWithoutWriteSettings = async () =>
      browserAuth.loginWithCustomRole(APM_ROLES.apmAllPrivilegesWithoutWriteSettings);
    const loginAsApmReadPrivilegesWithWriteSettings = async () =>
      browserAuth.loginWithCustomRole(APM_ROLES.apmReadPrivilegesWithWriteSettings);
    const loginAsApmMonitor = async () => browserAuth.loginWithCustomRole(APM_ROLES.apmMonitor);

    await use({
      ...browserAuth,
      loginAsApmAllPrivilegesWithoutWriteSettings,
      loginAsApmReadPrivilegesWithWriteSettings,
      loginAsApmMonitor,
    });
  },
});

export * as testData from './constants';
