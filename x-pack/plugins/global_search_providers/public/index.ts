/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializer } from 'src/core/public';
import {
  GlobalSearchProvidersPlugin,
  GlobalSearchProvidersPluginSetupDeps,
  GlobalSearchProvidersPluginStartDeps,
} from './plugin';
import { GlobalSearchProvidersPluginSetup, GlobalSearchProvidersPluginStart } from './types';

export const plugin: PluginInitializer<
  GlobalSearchProvidersPluginSetup,
  GlobalSearchProvidersPluginStart,
  GlobalSearchProvidersPluginSetupDeps,
  GlobalSearchProvidersPluginStartDeps
> = (context) => new GlobalSearchProvidersPlugin();

export { GlobalSearchProvidersPluginSetup, GlobalSearchProvidersPluginStart };
