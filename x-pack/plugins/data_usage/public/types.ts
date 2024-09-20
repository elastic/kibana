/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ManagementSetup, ManagementStart } from '@kbn/management-plugin/public';
import { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataUsagePublicSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataUsagePublicStart {}

export interface DataUsageSetupDependencies {
  management: ManagementSetup;
  share: SharePluginSetup;
}

export interface DataUsageStartDependencies {
  management: ManagementStart;
  share: SharePluginStart;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ConfigSchema {}
