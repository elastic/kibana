/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormBasedPersistedState, MetricVisualizationState } from '@kbn/lens-plugin/public';
import type { SavedObjectReference } from '@kbn/core/server';
import type { DataView } from '@kbn/data-views-plugin/public';
import { DEFAULT_LAYER_ID } from '../utils';

import type { Chart, ChartConfig, ChartLayer } from '../../types';

const ACCESSOR = 'metric_formula_accessor';

export class MetricChart implements Chart<MetricVisualizationState> {
  constructor(private chartConfig: ChartConfig<ChartLayer<MetricVisualizationState>>) {}

  getVisualizationType(): string {
    return 'lnsMetric';
  }

  getLayers(): FormBasedPersistedState['layers'] {
    return this.chartConfig.layers.getLayer(DEFAULT_LAYER_ID, ACCESSOR, this.chartConfig.dataView);
  }

  getVisualizationState(): MetricVisualizationState {
    return this.chartConfig.layers.getLayerConfig(DEFAULT_LAYER_ID, ACCESSOR);
  }

  getReferences(): SavedObjectReference[] {
    return this.chartConfig.layers.getReference(DEFAULT_LAYER_ID, this.chartConfig.dataView);
  }

  getDataView(): DataView {
    return this.chartConfig.dataView;
  }

  getTitle(): string {
    return this.chartConfig.title ?? '';
  }
}
