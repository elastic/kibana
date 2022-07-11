/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SuggestionRequest, VisualizationSuggestion, TableSuggestion } from '../../types';
import type { MetricState } from '../../../common/types';
import { layerTypes } from '../../../common';
import { LensIconChartMetric } from '../../assets/chart_metric';
// import { supportedTypes } from './visualization';

/**
 * Generate suggestions for the metric chart.
 *
 * @param opts
 */
export function getSuggestions({
  table,
  state,
  keptLayerIds,
}: SuggestionRequest<MetricState>): Array<VisualizationSuggestion<MetricState>> {
  return [];
}

function getSuggestion(table: TableSuggestion): VisualizationSuggestion<MetricState> {
  const col = table.columns[0];
  const title = table.label || col.operation.label;

  return {
    title,
    score: 0.1,
    previewIcon: LensIconChartMetric,
    state: {
      layerId: table.layerId,
      accessor: col.columnId,
      layerType: layerTypes.DATA,
    },
  };
}
