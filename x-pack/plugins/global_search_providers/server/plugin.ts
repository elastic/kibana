/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, Plugin } from 'src/core/server';
import { GlobalSearchPluginSetup } from '../../global_search/server';
import { GlobalSearchProvidersPluginSetup, GlobalSearchProvidersPluginStart } from './types';
import { createSavedObjectsResultProvider } from './providers';

export interface GlobalSearchProvidersPluginSetupDeps {
  globalSearch: GlobalSearchPluginSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GlobalSearchProvidersPluginStartDeps {}

export class GlobalSearchProvidersPlugin
  implements
    Plugin<
      GlobalSearchProvidersPluginSetup,
      GlobalSearchProvidersPluginStart,
      GlobalSearchProvidersPluginSetupDeps,
      GlobalSearchProvidersPluginStartDeps
    > {
  setup(
    {
      getStartServices,
    }: CoreSetup<GlobalSearchProvidersPluginStartDeps, GlobalSearchProvidersPluginStart>,
    { globalSearch }: GlobalSearchProvidersPluginSetupDeps
  ): GlobalSearchProvidersPluginSetup {
    globalSearch.registerResultProvider(createSavedObjectsResultProvider());
    return {};
  }

  start(): GlobalSearchProvidersPluginStart {
    return {};
  }
}
