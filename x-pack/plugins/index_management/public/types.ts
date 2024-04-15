/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { ManagementSetup } from '@kbn/management-plugin/public';
import { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import { CloudSetup } from '@kbn/cloud-plugin/public';
import { ConsolePluginStart } from '@kbn/console-plugin/public';
import { ScopedHistory } from '@kbn/core-application-browser';
import { IndexMappingProps } from './application/sections/home/index_list/details_page/index_mapping_with_context_types';
import { ExtensionsSetup, PublicApiServiceSetup } from './services';

export interface IndexManagementPluginSetup {
  apiService: PublicApiServiceSetup;
  extensionsService: ExtensionsSetup;
}

export interface IndexManagementPluginStart {
  extensionsService: ExtensionsSetup;
  getIndexMappingComponent: (deps: {
    history: ScopedHistory<unknown>;
  }) => React.FC<IndexMappingProps>;
}

export interface SetupDependencies {
  fleet?: unknown;
  usageCollection: UsageCollectionSetup;
  management: ManagementSetup;
  share: SharePluginSetup;
  cloud?: CloudSetup;
}

export interface StartDependencies {
  cloud?: CloudSetup;
  console?: ConsolePluginStart;
  share: SharePluginStart;
  fleet?: unknown;
  usageCollection: UsageCollectionSetup;
  management: ManagementSetup;
}

export interface ClientConfigType {
  ui: {
    enabled: boolean;
  };
  enableIndexActions?: boolean;
  enableLegacyTemplates?: boolean;
  enableIndexStats?: boolean;
  editableIndexSettings?: 'all' | 'limited';
  enableDataStreamsStorageColumn?: boolean;
}
