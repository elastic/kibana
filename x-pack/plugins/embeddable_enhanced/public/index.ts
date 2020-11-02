/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/public';
import { EmbeddableEnhancedPlugin } from './plugin';

export {
  SetupContract as EmbeddableEnhancedSetupContract,
  SetupDependencies as EmbeddableEnhancedSetupDependencies,
  StartContract as EmbeddableEnhancedStartContract,
  StartDependencies as EmbeddableEnhancedStartDependencies,
} from './plugin';

export function plugin(context: PluginInitializerContext) {
  return new EmbeddableEnhancedPlugin(context);
}

export { EnhancedEmbeddable, EnhancedEmbeddableContext } from './types';
export { isEnhancedEmbeddable } from './embeddables';
export { drilldownGrouping as embeddableEnhancedDrilldownGrouping } from './actions';
