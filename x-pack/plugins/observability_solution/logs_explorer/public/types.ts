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
import type { SharePluginSetup } from '@kbn/share-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { LogExplorerLocators } from '../common/locators';
import type { LogExplorerProps } from './components/log_explorer';
import type { CreateLogExplorerController } from './controller';

export interface LogExplorerPluginSetup {
  locators: LogExplorerLocators;
}
export interface LogExplorerPluginStart {
  LogExplorer: ComponentType<LogExplorerProps>;
  createLogExplorerController: CreateLogExplorerController;
}

export interface LogExplorerSetupDeps {
  share: SharePluginSetup;
  discover: DiscoverSetup;
}

export interface LogExplorerStartDeps {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  discover: DiscoverStart;
  fieldFormats: FieldFormatsStart;
  navigation: NavigationPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}
