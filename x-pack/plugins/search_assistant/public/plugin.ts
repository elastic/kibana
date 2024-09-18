/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/public';
import type {
  SearchAssistantPluginSetup,
  SearchAssistantPluginStart,
  SearchAssistantPluginStartDependencies,
} from './types';

export class SearchAssistantPlugin
  implements Plugin<SearchAssistantPluginSetup, SearchAssistantPluginStart>
{
  public setup(
    core: CoreSetup<SearchAssistantPluginStartDependencies, SearchAssistantPluginStart>
  ): SearchAssistantPluginSetup {
    return {};
  }

  public start(): SearchAssistantPluginStart {
    return {};
  }

  public stop() {}
}
