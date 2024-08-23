/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { SearchIndicesPluginSetup, SearchIndicesPluginStart } from './types';

export class SearchIndicesPlugin
  implements Plugin<SearchIndicesPluginSetup, SearchIndicesPluginStart>
{
  public setup(core: CoreSetup): SearchIndicesPluginSetup {
    return {};
  }

  public start(core: CoreStart): SearchIndicesPluginStart {
    return {};
  }

  public stop() {}
}
