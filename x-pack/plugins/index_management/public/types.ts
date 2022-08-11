/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { ManagementSetup } from '@kbn/management-plugin/public';
import { SharePluginStart } from '@kbn/share-plugin/public';
import { ExtensionsSetup } from './services';

export interface IndexManagementPluginSetup {
  extensionsService: ExtensionsSetup;
}

export interface SetupDependencies {
  fleet?: unknown;
  usageCollection: UsageCollectionSetup;
  management: ManagementSetup;
}

export interface StartDependencies {
  share: SharePluginStart;
}

export interface ClientConfigType {
  ui: {
    enabled: boolean;
  };
}
