/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ManagementSetup, ManagementStart } from '@kbn/management-plugin/public';
import {
  EnterpriseSearchPublicSetup,
  EnterpriseSearchPublicStart,
} from '@kbn/enterprise-search-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessSearchPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessSearchPluginStart {}

export interface ServerlessSearchPluginSetupDependencies {
  enterpriseSearch: EnterpriseSearchPublicSetup;
  management: ManagementSetup;
}

export interface ServerlessSearchPluginStartDependencies {
  enterpriseSearch: EnterpriseSearchPublicStart;
  management: ManagementStart;
}
