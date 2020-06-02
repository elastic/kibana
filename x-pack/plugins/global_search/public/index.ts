/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializer } from 'src/core/public';
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

export {
  GlobalSearchProviderFindOptions,
  GlobalSearchProviderResult,
  GlobalSearchProviderResultUrl,
  GlobalSearchResult,
} from '../common/types';
export {
  GlobalSearchPluginSetup,
  GlobalSearchPluginStart,
  GlobalSearchResultProvider,
} from './types';
export {
  GlobalSearchBatchedResults,
  GlobalSearchFindOptions,
  NavigableGlobalSearchResult,
} from './services/types';
