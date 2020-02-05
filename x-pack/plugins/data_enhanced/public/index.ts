/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from '../../../../src/core/public';
import { DataEnhancedPlugin, DataEnhancedSetup, DataEnhancedStart } from './plugin';

export const plugin = (initializerContext: PluginInitializerContext) =>
  new DataEnhancedPlugin(initializerContext);

export { DataEnhancedSetup, DataEnhancedStart };

export { ASYNC_SEARCH_STRATEGY, IAsyncSearchRequest, IAsyncSearchOptions } from './search';
