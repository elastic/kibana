/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from '../../../../src/core/public';
import { EnhancedDataPublicPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new EnhancedDataPublicPlugin(initializerContext);
}

export { EnhancedDataPublicPlugin as Plugin };

export { IAsyncSearchRequest, IAsyncSearchOptions } from './search/types';
