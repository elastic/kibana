/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { SearchNavigationPluginSetup, SearchNavigationPluginStart } from './types';

export class SearchNavigationPlugin
  implements Plugin<SearchNavigationPluginSetup, SearchNavigationPluginStart>
{
  public setup(core: CoreSetup): SearchNavigationPluginSetup {
    return {};
  }

  public start(core: CoreStart): SearchNavigationPluginStart {
    return {};
  }

  public stop() {}
}
