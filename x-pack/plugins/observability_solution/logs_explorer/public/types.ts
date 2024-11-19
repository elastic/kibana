/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ComponentType } from 'react';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DiscoverSetup, DiscoverStart } from '@kbn/discover-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { DiscoverSharedPublicStart } from '@kbn/discover-shared-plugin/public';
import type { LogsExplorerLocators } from '../common/locators';
import type { LogsExplorerProps } from './components/logs_explorer';
import type { CreateLogsExplorerController } from './controller';

export interface LogsExplorerPluginSetup {
  locators: LogsExplorerLocators;
}
export interface LogsExplorerPluginStart {
  LogsExplorer: ComponentType<LogsExplorerProps>;
  createLogsExplorerController: CreateLogsExplorerController;
}

export interface LogsExplorerSetupDeps {
  discover: DiscoverSetup;
  share: SharePluginSetup;
}

export interface LogsExplorerStartDeps {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  discover: DiscoverStart;
  fieldFormats: FieldFormatsStart;
  navigation: NavigationPublicPluginStart;
  share: SharePluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  discoverShared: DiscoverSharedPublicStart;
}
