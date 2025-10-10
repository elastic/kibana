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
import type { BrowserAuthFixture } from '@kbn/scout/src/playwright/fixtures/scope/test';
import type { KibanaRole } from '@kbn/scout/src/common/services/custom_role';
import { ServiceMapPage } from './page_objects/service_map';
import { ServiceInventoryPage } from './page_objects/service_inventory';
import { GeneralSettingsPage } from './page_objects/general_settings';
import { CustomLinksPage } from './page_objects/custom_links';
import { IndicesPage } from './page_objects/indices';
import { AgentConfigurationsPage } from './page_objects/agent_configurations';
import { AgentExplorerPage } from './page_objects/agent_explorer';
import { AgentKeysPage } from './page_objects/agent_keys';
import { AnomalyDetectionPage } from './page_objects/anomaly_detection';

// APM-specific role definitions matching authentication.ts
const APM_ROLES = {
  apmAllPrivilegesWithoutWriteSettings: {
    elasticsearch: {
      cluster: ['manage_api_key'],
      indices: [
        {
          names: ['apm-*'],
          privileges: ['read', 'view_index_metadata'],
        },
      ],
    },
    kibana: [
      {
        base: [],
        feature: { apm: ['minimal_all'], ml: ['all'] },
        spaces: ['*'],
      },
    ],
  } as KibanaRole,

  apmReadPrivilegesWithWriteSettings: {
    elasticsearch: {
      cluster: ['manage_api_key'],
    },
    kibana: [
      {
        base: [],
        feature: {
          apm: ['minimal_read', 'settings_save'],
          advancedSettings: ['all'],
          ml: ['all'],
          savedObjectsManagement: ['all'],
        },
        spaces: ['*'],
      },
    ],
  } as KibanaRole,
};

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
});

// Export custom APM login methods for direct use in tests
// These roles match the ones defined in server/test_helpers/create_apm_users/authentication.ts
//
// Roles:
// - apmAllPrivilegesWithoutWriteSettings: Has APM 'minimal_all' + ML 'all', but cannot save settings
// - apmReadPrivilegesWithWriteSettings: Has APM 'minimal_read' + 'settings_save' + advanced settings access
export const apmAuth = {
  loginAsApmAllPrivilegesWithoutWriteSettings: (browserAuth: BrowserAuthFixture) =>
    browserAuth.loginWithCustomRole(APM_ROLES.apmAllPrivilegesWithoutWriteSettings),
  loginAsApmReadPrivilegesWithWriteSettings: (browserAuth: BrowserAuthFixture) =>
    browserAuth.loginWithCustomRole(APM_ROLES.apmReadPrivilegesWithWriteSettings),
};

export * as testData from './constants';
