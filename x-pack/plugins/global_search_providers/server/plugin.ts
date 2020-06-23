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

export class GlobalSearchProvidersPlugin
  implements Plugin<{}, {}, GlobalSearchProvidersPluginSetupDeps, {}> {
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
