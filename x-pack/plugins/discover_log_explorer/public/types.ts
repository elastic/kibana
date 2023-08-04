/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DiscoverSetup, DiscoverStart } from '@kbn/discover-plugin/public';
import { SharePluginSetup } from '@kbn/share-plugin/public';
import { DiscoverLogExplorerLocators } from '../common/locators';

export interface DiscoverLogExplorerPluginSetup {
  locators: DiscoverLogExplorerLocators;
}
export type DiscoverLogExplorerPluginStart = void;

export interface DiscoverLogExplorerSetupDeps {
  share: SharePluginSetup;
  discover: DiscoverSetup;
}

export interface DiscoverLogExplorerStartDeps {
  data: DataPublicPluginStart;
  discover: DiscoverStart;
}
