/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IconChartMetric } from '@kbn/chart-icons';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { SuggestionRequest, VisualizationSuggestion, TableSuggestion } from '../../types';
import type { LegacyMetricState } from '../../../common/types';
import { legacyMetricSupportedTypes } from './visualization';

/**
 * Generate suggestions for the metric chart.
 *
 * @param opts
 */
export function getSuggestions({
  table,
  state,
  keptLayerIds,
}: SuggestionRequest<LegacyMetricState>): Array<VisualizationSuggestion<LegacyMetricState>> {
  // We only render metric charts for single-row queries. We require a single, numeric column.
  if (
    table.isMultiRow ||
    keptLayerIds.length > 1 ||
    (keptLayerIds.length && table.layerId !== keptLayerIds[0]) ||
    table.columns.length !== 1 ||
    table.columns[0].operation.isBucketed ||
    !legacyMetricSupportedTypes.has(table.columns[0].operation.dataType) ||
    table.columns[0].operation.isStaticValue
  ) {
    return [];
  }

  // don't suggest current table if visualization is active
  if (state && table.changeType === 'unchanged') {
    return [];
  }

  return [getSuggestion(table)];
}

function getSuggestion(table: TableSuggestion): VisualizationSuggestion<LegacyMetricState> {
  const col = table.columns[0];
  const title = table.label || col.operation.label;

  return {
    title,
    score: 0.1,
    previewIcon: IconChartMetric,
    state: {
      layerId: table.layerId,
      accessor: col.columnId,
      layerType: LayerTypes.DATA,
    },
  };
}
