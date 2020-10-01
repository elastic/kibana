/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ast } from '@kbn/interpreter/common';
import { Operation, DatasourcePublicAPI } from '../types';
import { DEFAULT_PERCENT_DECIMALS } from './constants';
import { PieVisualizationState } from './types';

export function toExpression(
  state: PieVisualizationState,
  datasourceLayers: Record<string, DatasourcePublicAPI>
) {
  return expressionHelper(state, datasourceLayers, false);
}

function expressionHelper(
  state: PieVisualizationState,
  datasourceLayers: Record<string, DatasourcePublicAPI>,
  isPreview: boolean
): Ast | null {
  const layer = state.layers[0];
  const datasource = datasourceLayers[layer.layerId];
  const operations = layer.groups
    .map((columnId) => ({ columnId, operation: datasource.getOperationForColumnId(columnId) }))
    .filter((o): o is { columnId: string; operation: Operation } => !!o.operation);
  if (!layer.metric || !operations.length) {
    return null;
  }

  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'lens_pie',
        arguments: {
          shape: [state.shape],
          hideLabels: [isPreview],
          groups: operations.map((o) => o.columnId),
          metric: [layer.metric],
          numberDisplay: [layer.numberDisplay],
          categoryDisplay: [layer.categoryDisplay],
          legendDisplay: [layer.legendDisplay],
          legendPosition: [layer.legendPosition || 'right'],
          percentDecimals: [layer.percentDecimals ?? DEFAULT_PERCENT_DECIMALS],
          nestedLegend: [!!layer.nestedLegend],
        },
      },
    ],
  };
}

export function toPreviewExpression(
  state: PieVisualizationState,
  datasourceLayers: Record<string, DatasourcePublicAPI>
) {
  return expressionHelper(state, datasourceLayers, true);
}
