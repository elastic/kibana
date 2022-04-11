/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ast } from '@kbn/interpreter';
import { Position } from '@elastic/charts';
import type { PaletteOutput, PaletteRegistry } from '@kbn/coloring';

import {
  buildExpression,
  buildExpressionFunction,
} from '../../../../../src/plugins/expressions/public';
import type { Operation, DatasourcePublicAPI } from '../types';
import { DEFAULT_PERCENT_DECIMALS } from './constants';
import { shouldShowValuesInLegend } from './render_helpers';
import {
  CategoryDisplay,
  NumberDisplay,
  PieChartTypes,
  PieLayerState,
  PieVisualizationState,
  EmptySizeRatios,
  LegendDisplay,
} from '../../common';
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

type GenerateLabelsAstArguments = (
  state: PieVisualizationState,
  attributes: Attributes,
  layer: PieLayerState
) => [Ast];

export const getSortedGroups = (datasource: DatasourcePublicAPI, layer: PieLayerState) => {
  const originalOrder = datasource
    .getTableSpec()
    .map(({ columnId }: { columnId: string }) => columnId)
    .filter((columnId: string) => layer.groups.includes(columnId));
  // When we add a column it could be empty, and therefore have no order
  return Array.from(new Set(originalOrder.concat(layer.groups)));
};

const prepareDimension = (accessor: string) => {
  const visdimension = buildExpressionFunction('visdimension', { accessor });
  return buildExpression([visdimension]).toAst();
};

const generateCommonLabelsAstArgs: GenerateLabelsAstArguments = (state, attributes, layer) => {
  const show = [!attributes.isPreview && layer.categoryDisplay !== CategoryDisplay.HIDE];
  const position = layer.categoryDisplay !== CategoryDisplay.HIDE ? [layer.categoryDisplay] : [];
  const values = [layer.numberDisplay !== NumberDisplay.HIDDEN];
  const valuesFormat = layer.numberDisplay !== NumberDisplay.HIDDEN ? [layer.numberDisplay] : [];
  const percentDecimals = [layer.percentDecimals ?? DEFAULT_PERCENT_DECIMALS];

  return [
    {
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: 'partitionLabels',
          arguments: { show, position, values, valuesFormat, percentDecimals },
        },
      ],
    },
  ];
};

const generateWaffleLabelsAstArguments: GenerateLabelsAstArguments = (...args) => {
  const [labelsExpr] = generateCommonLabelsAstArgs(...args);
  const [labels] = labelsExpr.chain;
  return [
    {
      ...labelsExpr,
      chain: [{ ...labels, percentDecimals: DEFAULT_PERCENT_DECIMALS }],
    },
  ];
};

const generatePaletteAstArguments = (
  paletteService: PaletteRegistry,
  palette?: PaletteOutput
): [Ast] =>
  palette
    ? [
        {
          type: 'expression',
          chain: [
            {
              type: 'function',
              function: 'theme',
              arguments: {
                variable: ['palette'],
                default: [paletteService.get(palette.name).toExpression(palette.params)],
              },
            },
          ],
        },
      ]
    : [paletteService.get('default').toExpression()];

const generateCommonArguments: GenerateExpressionAstArguments = (
  state,
  attributes,
  operations,
  layer,
  datasourceLayers,
  paletteService
) => ({
  labels: generateCommonLabelsAstArgs(state, attributes, layer),
  buckets: operations.map((o) => o.columnId).map(prepareDimension),
  metric: layer.metric ? [prepareDimension(layer.metric)] : [],
  legendDisplay: [attributes.isPreview ? LegendDisplay.HIDE : layer.legendDisplay],
  legendPosition: [layer.legendPosition || Position.Right],
  maxLegendLines: [layer.legendMaxLines ?? 1],
  legendSize: layer.legendSize ? [layer.legendSize] : [],
  nestedLegend: [!!layer.nestedLegend],
  truncateLegend: [
    layer.truncateLegend ?? getDefaultVisualValuesForLayer(state, datasourceLayers).truncateText,
  ],
  palette: generatePaletteAstArguments(paletteService, state.palette),
});

const generatePieVisAst: GenerateExpressionAstFunction = (...rest) => ({
  type: 'expression',
  chain: [
    {
      type: 'function',
      function: 'pieVis',
      arguments: {
        ...generateCommonArguments(...rest),
        respectSourceOrder: [false],
        startFromSecondLargestSlice: [true],
      },
    },
  ],
});

const generateDonutVisAst: GenerateExpressionAstFunction = (...rest) => {
  const [, , , layer] = rest;
  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'pieVis',
        arguments: {
          ...generateCommonArguments(...rest),
          respectSourceOrder: [false],
          isDonut: [true],
          startFromSecondLargestSlice: [true],
          emptySizeRatio: [layer.emptySizeRatio ?? EmptySizeRatios.SMALL],
        },
      },
    ],
  };
};

const generateTreemapVisAst: GenerateExpressionAstFunction = (...rest) => {
  const [, , , layer] = rest;
  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'treemapVis',
        arguments: {
          ...generateCommonArguments(...rest),
          nestedLegend: [!!layer.nestedLegend],
        },
      },
    ],
  };
};

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

const generateWaffleVisAst: GenerateExpressionAstFunction = (...rest) => {
  const { buckets, nestedLegend, ...args } = generateCommonArguments(...rest);
  const [state, attributes, , layer] = rest;
  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'waffleVis',
        arguments: {
          ...args,
          bucket: buckets,
          labels: generateWaffleLabelsAstArguments(state, attributes, layer),
          showValuesInLegend: [shouldShowValuesInLegend(layer, state.shape)],
        },
      },
    ],
  };
};

const generateExprAst: GenerateExpressionAstFunction = (state, ...restArgs) =>
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
  const groups = getSortedGroups(datasource, layer);

  const operations = groups
    .map((columnId) => ({
      columnId,
      operation: datasource.getOperationForColumnId(columnId) as Operation | null,
    }))
    .filter((o): o is { columnId: string; operation: Operation } => !!o.operation);

  if (!layer.metric || !operations.length) {
    return null;
  }

  return generateExprAst(state, attributes, operations, layer, datasourceLayers, paletteService);
}

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

export function toPreviewExpression(
  state: PieVisualizationState,
  datasourceLayers: Record<string, DatasourcePublicAPI>,
  paletteService: PaletteRegistry
) {
  return expressionHelper(state, datasourceLayers, paletteService, { isPreview: true });
}
