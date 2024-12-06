/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from '@kbn/core/public';

import { SearchSynonymsPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new SearchSynonymsPlugin(initializerContext);
}

export const SYNONYMS_UI_FLAG = 'searchSynonyms:synonymsEnabled';
