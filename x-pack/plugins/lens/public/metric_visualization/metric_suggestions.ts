/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SuggestionRequest, VisualizationSuggestion, TableSuggestion } from '../types';
import { MetricState } from './types';
import { LensIconChartMetric } from '../assets/chart_metric';

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
  // We only render metric charts for single-row queries. We require a single, numeric column.
  if (
    table.isMultiRow ||
    keptLayerIds.length > 1 ||
    (keptLayerIds.length && table.layerId !== keptLayerIds[0]) ||
    table.columns.length !== 1 ||
    table.columns[0].operation.dataType !== 'number'
  ) {
    return [];
  }

  // don't suggest current table if visualization is active
  if (state && table.changeType === 'unchanged') {
    return [];
  }

  return [getSuggestion(table)];
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
    },
  };
}
