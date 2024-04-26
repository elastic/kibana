/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import type { DataVisualizerCoreSetup } from '../../../plugin';
import type { DataVisualizerSetupDependencies } from '../../common/types/data_visualizer_plugin';
import { FIELD_STATS_EMBED_ID } from './grid_embeddable/constants';
import { registerFieldStatsUIActions } from './grid_embeddable/ui_actions/create_field_stats_embeddable_ui_action';
export function registerReactEmbeddablesAndActions(
  core: DataVisualizerCoreSetup,
  plugins: DataVisualizerSetupDependencies
) {
  // Embeddable factory for field stats table
  if (plugins.uiActions) {
    registerFieldStatsUIActions(plugins.uiActions);
  }
  registerReactEmbeddableFactory(FIELD_STATS_EMBED_ID, async () => {
    const { getFieldStatsTableFactory } = await import(
      './grid_embeddable/field_stats_embeddable_factory'
    );
    return getFieldStatsTableFactory(core);
  });
}
