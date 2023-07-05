/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormBasedPersistedState, MetricVisualizationState } from '@kbn/lens-plugin/public';
import type { SavedObjectReference } from '@kbn/core-saved-objects-common';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Filter } from '@kbn/es-query';
import { DEFAULT_AD_HOC_DATA_VIEW_ID, DEFAULT_LAYER_ID } from '../utils';

import type { Chart, MetricChartConfig } from '../../types';
import { getFilters } from '../formulas/host/utils';

const ACCESSOR = 'metric_formula_accessor';

export class MetricChart implements Chart<MetricVisualizationState> {
  constructor(private state: MetricChartConfig) {}

  getVisualizationType(): string {
    return 'lnsMetric';
  }

  getLayers(): FormBasedPersistedState['layers'] {
    return this.state.layers.getLayer(DEFAULT_LAYER_ID, ACCESSOR, this.state.dataView);
  }

  getVisualizationState(): MetricVisualizationState {
    return this.state.layers.getLayerConfig(DEFAULT_LAYER_ID, ACCESSOR);
  }

  getReferences(): SavedObjectReference[] {
    return this.state.layers.getReference(DEFAULT_LAYER_ID, this.state.dataView);
  }

  getDataView(): DataView {
    return this.state.dataView;
  }

  getTitle(): string {
    return this.state.options?.showTitle
      ? this.state.options?.title ?? this.state.layers.getName()
      : '';
  }

  getFilters(): Filter[] {
    return getFilters({
      id: this.state.dataView.id ?? DEFAULT_AD_HOC_DATA_VIEW_ID,
    });
  }
}
