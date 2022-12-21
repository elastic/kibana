/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Plugin } from '@kbn/core/server';
import { GlobalSearchPluginSetup } from '@kbn/global-search-plugin/server';
import { createSavedObjectsResultProvider } from './providers';

export interface GlobalSearchProvidersPluginSetupDeps {
  globalSearch: GlobalSearchPluginSetup;
}

export class GlobalSearchProvidersPlugin
  implements Plugin<{}, {}, GlobalSearchProvidersPluginSetupDeps, {}>
{
  setup(
    { getStartServices }: CoreSetup<{}, {}>,
    { globalSearch }: GlobalSearchProvidersPluginSetupDeps
  ) {
    globalSearch.registerResultProvider(createSavedObjectsResultProvider());
    return {};
  }

  start() {
    return {};
  }
}
