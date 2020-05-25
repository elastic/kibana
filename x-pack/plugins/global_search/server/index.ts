/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializer } from 'src/core/server';
import { GlobalSearchPlugin, GlobalSearchPluginSetupDeps } from './plugin';
import { GlobalSearchPluginSetup, GlobalSearchPluginStart } from './types';

export const plugin: PluginInitializer<
  GlobalSearchPluginSetup,
  GlobalSearchPluginStart,
  GlobalSearchPluginSetupDeps,
  {}
> = (context) => new GlobalSearchPlugin(context);

export { config } from './config';

export {
  GlobalSearchProviderFindOptions,
  GlobalSearchProviderResult,
  GlobalSearchProviderResultUrl,
  GlobalSearchResult,
} from '../common/types';
export {
  GlobalSearchBatchedResults,
  GlobalSearchFindOptions,
  GlobalSearchProviderContext,
  GlobalSearchPluginStart,
  GlobalSearchPluginSetup,
  GlobalSearchResultProvider,
  RouteHandlerGlobalSearchContext,
} from './types';
