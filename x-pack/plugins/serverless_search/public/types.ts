/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { ManagementSetup, ManagementStart } from '@kbn/management-plugin/public';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import type { ServerlessPluginSetup, ServerlessPluginStart } from '@kbn/serverless/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { MlPluginSetup } from '@kbn/ml-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessSearchPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessSearchPluginStart {}

export interface ServerlessSearchPluginSetupDependencies {
  cloud: CloudSetup;
  management: ManagementSetup;
  serverless: ServerlessPluginSetup;
  ml: MlPluginSetup;
}

export interface ServerlessSearchPluginStartDependencies {
  cloud: CloudStart;
  management: ManagementStart;
  security: SecurityPluginStart;
  serverless: ServerlessPluginStart;
  share: SharePluginStart;
}
