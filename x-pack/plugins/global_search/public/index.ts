/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializer } from '../../../../src/core/public/plugins/plugin';
import type { GlobalSearchPluginSetupDeps, GlobalSearchPluginStartDeps } from './plugin';
import { GlobalSearchPlugin } from './plugin';
import type { GlobalSearchPluginSetup, GlobalSearchPluginStart } from './types';

export const plugin: PluginInitializer<
  GlobalSearchPluginSetup,
  GlobalSearchPluginStart,
  GlobalSearchPluginSetupDeps,
  GlobalSearchPluginStartDeps
> = (context) => new GlobalSearchPlugin(context);

export {
  GlobalSearchBatchedResults,
  GlobalSearchFindParams,
  GlobalSearchProviderFindOptions,
  GlobalSearchProviderFindParams,
  GlobalSearchProviderResult,
  GlobalSearchProviderResultUrl,
  GlobalSearchResult,
} from '../common/types';
export { GlobalSearchFindOptions } from './services/types';
export {
  GlobalSearchPluginSetup,
  GlobalSearchPluginStart,
  GlobalSearchResultProvider,
} from './types';
