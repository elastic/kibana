/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import { ConsolePluginStart } from '@kbn/console-plugin/public';
import { ManagementSetup, ManagementStart } from '@kbn/management-plugin/public';
import { SecurityPluginStart } from '@kbn/security-plugin/public';
import { ServerlessPluginSetup, ServerlessPluginStart } from '@kbn/serverless/public';
import { SharePluginStart } from '@kbn/share-plugin/public';
import { IndexManagementPluginStart } from '@kbn/index-management-plugin/public';
import type { DiscoverSetup } from '@kbn/discover-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessSearchPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessSearchPluginStart {}

export interface ServerlessSearchPluginSetupDependencies {
  cloud: CloudSetup;
  management: ManagementSetup;
  serverless: ServerlessPluginSetup;
  discover: DiscoverSetup;
}

export interface ServerlessSearchPluginStartDependencies {
  cloud: CloudStart;
  console: ConsolePluginStart;
  management: ManagementStart;
  security: SecurityPluginStart;
  serverless: ServerlessPluginStart;
  share: SharePluginStart;
  indexManagement?: IndexManagementPluginStart;
}
