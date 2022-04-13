/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from 'src/core/public';
import { EmbeddableEnhancedPlugin } from './plugin';

export type {
  SetupContract as EmbeddableEnhancedSetupContract,
  SetupDependencies as EmbeddableEnhancedSetupDependencies,
  StartContract as EmbeddableEnhancedStartContract,
  StartDependencies as EmbeddableEnhancedStartDependencies,
} from './plugin';

export function plugin(context: PluginInitializerContext) {
  return new EmbeddableEnhancedPlugin(context);
}

export type { EnhancedEmbeddable, EnhancedEmbeddableContext } from './types';
export { isEnhancedEmbeddable } from './embeddables';
export { drilldownGrouping as embeddableEnhancedDrilldownGrouping } from './actions';
