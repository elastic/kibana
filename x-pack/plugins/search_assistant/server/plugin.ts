/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin } from '@kbn/core/server';

import type { SearchAssistantPluginSetup, SearchAssistantPluginStart } from './types';

export class SearchAssistantPlugin
  implements Plugin<SearchAssistantPluginSetup, SearchAssistantPluginStart>
{
  constructor() {}

  public setup() {
    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
