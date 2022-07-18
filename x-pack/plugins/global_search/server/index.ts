/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializer } from '@kbn/core/server';
import {
  GlobalSearchPlugin,
  GlobalSearchPluginSetupDeps,
  GlobalSearchPluginStartDeps,
} from './plugin';
import { GlobalSearchPluginSetup, GlobalSearchPluginStart } from './types';

export const plugin: PluginInitializer<
  GlobalSearchPluginSetup,
  GlobalSearchPluginStart,
  GlobalSearchPluginSetupDeps,
  GlobalSearchPluginStartDeps
> = (context) => new GlobalSearchPlugin(context);

export { config } from './config';

export type {
  GlobalSearchBatchedResults,
  GlobalSearchProviderFindOptions,
  GlobalSearchProviderResult,
  GlobalSearchProviderResultUrl,
  GlobalSearchResult,
} from '../common/types';
export type {
  GlobalSearchFindOptions,
  GlobalSearchProviderContext,
  GlobalSearchPluginStart,
  GlobalSearchPluginSetup,
  GlobalSearchResultProvider,
  RouteHandlerGlobalSearchContext,
} from './types';
