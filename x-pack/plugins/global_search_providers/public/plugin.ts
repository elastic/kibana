/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, Plugin } from 'src/core/public';
import { GlobalSearchPluginSetup } from '../../global_search/public';
import { GlobalSearchProvidersPluginSetup, GlobalSearchProvidersPluginStart } from './types';
import { createApplicationResultProvider } from './providers';

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
    const applicationPromise = getStartServices().then(([core]) => core.application);
    globalSearch.registerResultProvider(createApplicationResultProvider(applicationPromise));
    return {};
  }

  start(): GlobalSearchProvidersPluginStart {
    return {};
  }
}
