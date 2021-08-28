/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializerContext } from '../../../../src/core/public/plugins/plugin_context';
import type { ConfigSchema } from '../config';
import type { DataEnhancedSetup, DataEnhancedStart } from './plugin';
import { DataEnhancedPlugin } from './plugin';

export const plugin = (initializerContext: PluginInitializerContext<ConfigSchema>) =>
  new DataEnhancedPlugin(initializerContext);

export {
  ENHANCED_ES_SEARCH_STRATEGY,
  EQL_SEARCH_STRATEGY,
} from '../../../../src/plugins/data/common';
export { DataEnhancedSetup, DataEnhancedStart };
