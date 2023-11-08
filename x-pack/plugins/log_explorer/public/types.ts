/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ComponentType } from 'react';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DiscoverSetup, DiscoverStart } from '@kbn/discover-plugin/public';
import { SharePluginSetup } from '@kbn/share-plugin/public';
import { LogExplorerLocators } from '../common/locators';
import type { LogExplorerProps } from './components/log_explorer';

export interface LogExplorerPluginSetup {
  locators: LogExplorerLocators;
}
export interface LogExplorerPluginStart {
  LogExplorer: ComponentType<LogExplorerProps>;
}

export interface LogExplorerSetupDeps {
  share: SharePluginSetup;
  discover: DiscoverSetup;
}

export interface LogExplorerStartDeps {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  discover: DiscoverStart;
}
