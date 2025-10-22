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
import { GeneralSettingsPage } from './page_objects/general_settings';
import { CustomLinksPage } from './page_objects/custom_links';
import { IndicesPage } from './page_objects/indices';
import { AgentConfigurationsPage } from './page_objects/agent_configurations';
import { AgentExplorerPage } from './page_objects/agent_explorer';
import { AgentKeysPage } from './page_objects/agent_keys';
import { AnomalyDetectionPage } from './page_objects/anomaly_detection';
import { APM_ROLES } from './constants';

export interface ApmBrowserAuthFixture extends BrowserAuthFixture {
  loginAsApmAllPrivilegesWithoutWriteSettings: () => Promise<void>;
  loginAsApmReadPrivilegesWithWriteSettings: () => Promise<void>;
}

export interface ExtendedScoutTestFixtures extends ObltTestFixtures {
  pageObjects: ObltPageObjects & {
    serviceMapPage: ServiceMapPage;
    serviceInventoryPage: ServiceInventoryPage;
    generalSettingsPage: GeneralSettingsPage;
    agentConfigurationsPage: AgentConfigurationsPage;
    customLinksPage: CustomLinksPage;
    indicesPage: IndicesPage;
    agentExplorerPage: AgentExplorerPage;
    agentKeysPage: AgentKeysPage;
    anomalyDetectionPage: AnomalyDetectionPage;
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
      generalSettingsPage: createLazyPageObject(GeneralSettingsPage, page, kbnUrl),
      agentConfigurationsPage: createLazyPageObject(AgentConfigurationsPage, page, kbnUrl),
      customLinksPage: createLazyPageObject(CustomLinksPage, page, kbnUrl),
      indicesPage: createLazyPageObject(IndicesPage, page, kbnUrl),
      agentExplorerPage: createLazyPageObject(AgentExplorerPage, page, kbnUrl),
      agentKeysPage: createLazyPageObject(AgentKeysPage, page, kbnUrl),
      anomalyDetectionPage: createLazyPageObject(AnomalyDetectionPage, page, kbnUrl),
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

    await use({
      ...browserAuth,
      loginAsApmAllPrivilegesWithoutWriteSettings,
      loginAsApmReadPrivilegesWithWriteSettings,
    });
  },
});

export * as testData from './constants';
