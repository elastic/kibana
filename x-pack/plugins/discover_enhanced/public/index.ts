/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/public';
import { DiscoverEnhancedPlugin } from './plugin';

export type { ExploreDataContextMenuAction, ExploreDataChartAction } from './actions';

export type {
  DiscoverEnhancedPlugin,
  DiscoverEnhancedSetupDependencies,
  DiscoverEnhancedStartDependencies,
} from './plugin';

export const plugin = (initializerContext: PluginInitializerContext) =>
  new DiscoverEnhancedPlugin(initializerContext);
