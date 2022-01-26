/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ast } from '@kbn/interpreter';
import type { PaletteRegistry } from 'src/plugins/charts/public';
import type { Operation, DatasourcePublicAPI } from '../types';
import { DEFAULT_PERCENT_DECIMALS, EMPTY_SIZE_RATIOS } from './constants';
import { shouldShowValuesInLegend } from './render_helpers';
import { PieChartTypes, PieLayerState, PieVisualizationState } from '../../common';
import { getDefaultVisualValuesForLayer } from '../shared_components/datasource_default_values';

interface Attributes {
  isPreview: boolean;
  title?: string;
  description?: string;
}

interface OperationColumnId {
  columnId: string;
  operation: Operation;
}

type GenerateExpressionAstFunction = (
  state: PieVisualizationState,
  attributes: Attributes,
  operations: OperationColumnId[],
  layer: PieLayerState,
  datasourceLayers: Record<string, DatasourcePublicAPI>,
  paletteService: PaletteRegistry
) => Ast | null;

type GenerateExpressionAstArguments = (
  state: PieVisualizationState,
  attributes: Attributes,
  operations: OperationColumnId[],
  layer: PieLayerState,
  datasourceLayers: Record<string, DatasourcePublicAPI>,
  paletteService: PaletteRegistry
) => Ast['chain'][number]['arguments'];

export function toExpression(
  state: PieVisualizationState,
  datasourceLayers: Record<string, DatasourcePublicAPI>,
  paletteService: PaletteRegistry,
  attributes: Partial<{ title: string; description: string }> = {}
) {
  return expressionHelper(state, datasourceLayers, paletteService, {
    ...attributes,
    isPreview: false,
  });
}

const generateCommonArguments: GenerateExpressionAstArguments = (
  state,
  attributes,
  operations,
  layer,
  datasourceLayers,
  paletteService
) => ({
  labels: [
    {
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: 'partitionLabels',
          arguments: {
            show: [attributes.isPreview],
            position: [layer.categoryDisplay],
          },
        },
      ],
    },
  ],
  groups: operations.map((o) => o.columnId),
  metric: layer.metric ? [layer.metric] : [],
  numberDisplay: [layer.numberDisplay],
  legendDisplay: [layer.legendDisplay],
  legendPosition: [layer.legendPosition || 'right'],
  emptySizeRatio: [layer.emptySizeRatio ?? EMPTY_SIZE_RATIOS.SMALL],
  showValuesInLegend: [shouldShowValuesInLegend(layer, state.shape)],
  percentDecimals: [
    state.shape === 'waffle'
      ? DEFAULT_PERCENT_DECIMALS
      : layer.percentDecimals ?? DEFAULT_PERCENT_DECIMALS,
  ],
  legendMaxLines: [layer.legendMaxLines ?? 1],
  truncateLegend: [
    layer.truncateLegend ?? getDefaultVisualValuesForLayer(state, datasourceLayers).truncateText,
  ],
  nestedLegend: [!!layer.nestedLegend],
  ...(state.palette
    ? {
        palette: [
          {
            type: 'expression',
            chain: [
              {
                type: 'function',
                function: 'theme',
                arguments: {
                  variable: ['palette'],
                  default: [
                    paletteService.get(state.palette.name).toExpression(state.palette.params),
                  ],
                },
              },
            ],
          },
        ],
      }
    : {}),
});

const generatePieVisAst: GenerateExpressionAstFunction = (...rest) => ({
  type: 'expression',
  chain: [
    {
      type: 'function',
      function: 'pieVis',
      arguments: generateCommonArguments(...rest),
    },
  ],
});

const generateDonutVisAst: GenerateExpressionAstFunction = (...rest) => ({
  type: 'expression',
  chain: [
    {
      type: 'function',
      function: 'pieVis',
      arguments: generateCommonArguments(...rest),
    },
  ],
});

const generateTreemapVisAst: GenerateExpressionAstFunction = (...rest) => ({
  type: 'expression',
  chain: [
    {
      type: 'function',
      function: 'treemapVis',
      arguments: generateCommonArguments(...rest),
    },
  ],
});

const generateMosaicVisAst: GenerateExpressionAstFunction = (...rest) => ({
  type: 'expression',
  chain: [
    {
      type: 'function',
      function: 'mosaicVis',
      arguments: generateCommonArguments(...rest),
    },
  ],
});

const generateWaffleVisAst: GenerateExpressionAstFunction = (...rest) => ({
  type: 'expression',
  chain: [
    {
      type: 'function',
      function: 'mosaicVis',
      arguments: generateCommonArguments(...rest),
    },
  ],
});

const generateExpressionFunctionAst: GenerateExpressionAstFunction = (state, ...restArgs) =>
  ({
    [PieChartTypes.PIE]: () => generatePieVisAst(state, ...restArgs),
    [PieChartTypes.DONUT]: () => generateDonutVisAst(state, ...restArgs),
    [PieChartTypes.TREEMAP]: () => generateTreemapVisAst(state, ...restArgs),
    [PieChartTypes.MOSAIC]: () => generateMosaicVisAst(state, ...restArgs),
    [PieChartTypes.WAFFLE]: () => generateWaffleVisAst(state, ...restArgs),
  }[state.shape]());

function expressionHelper(
  state: PieVisualizationState,
  datasourceLayers: Record<string, DatasourcePublicAPI>,
  paletteService: PaletteRegistry,
  attributes: Attributes = { isPreview: false }
): Ast | null {
  const layer = state.layers[0];
  const datasource = datasourceLayers[layer.layerId];
  const operations = layer.groups
    .map((columnId) => ({ columnId, operation: datasource.getOperationForColumnId(columnId) }))
    .filter((o): o is { columnId: string; operation: Operation } => !!o.operation);

  if (!layer.metric || !operations.length) {
    return null;
  }

  return generateExpressionFunctionAst(
    state,
    attributes,
    operations,
    layer,
    datasourceLayers,
    paletteService
  );
}

export function toPreviewExpression(
  state: PieVisualizationState,
  datasourceLayers: Record<string, DatasourcePublicAPI>,
  paletteService: PaletteRegistry
) {
  return expressionHelper(state, datasourceLayers, paletteService, { isPreview: true });
}
