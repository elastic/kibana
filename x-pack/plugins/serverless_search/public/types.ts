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
import { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import { SecurityPluginStart } from '@kbn/security-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessSearchPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessSearchPluginStart {}

export interface ServerlessSearchPluginSetupDependencies {
  cloud: CloudSetup;
  enterpriseSearch: EnterpriseSearchPublicSetup;
  management: ManagementSetup;
}

export interface ServerlessSearchPluginStartDependencies {
  cloud: CloudStart;
  enterpriseSearch: EnterpriseSearchPublicStart;
  management: ManagementStart;
  security: SecurityPluginStart;
}
