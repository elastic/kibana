/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from 'kibana/public';
import { DataEnhancedPlugin, DataEnhancedSetup, DataEnhancedStart } from './plugin';
import { ConfigSchema } from '../config';

export const plugin = (initializerContext: PluginInitializerContext<ConfigSchema>) =>
  new DataEnhancedPlugin(initializerContext);

export type { DataEnhancedSetup, DataEnhancedStart };

export {
  ENHANCED_ES_SEARCH_STRATEGY,
  EQL_SEARCH_STRATEGY,
} from '../../../../src/plugins/data/common';
