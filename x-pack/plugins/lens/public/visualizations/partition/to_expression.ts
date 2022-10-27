/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ast, AstFunction } from '@kbn/interpreter';
import { Position } from '@elastic/charts';
import type { PaletteOutput, PaletteRegistry } from '@kbn/coloring';

import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/public';
import type { Operation, DatasourcePublicAPI, DatasourceLayers } from '../../types';
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
} from '../../../common';
import { getDefaultVisualValuesForLayer } from '../../shared_components/datasource_default_values';
import { isCollapsed } from './visualization';

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
  datasourceLayers: DatasourceLayers,
  paletteService: PaletteRegistry
) => Ast | null;

type GenerateExpressionAstArguments = (
  state: PieVisualizationState,
  attributes: Attributes,
  operations: OperationColumnId[],
  layer: PieLayerState,
  datasourceLayers: DatasourceLayers,
  paletteService: PaletteRegistry
) => Ast['chain'][number]['arguments'];

type GenerateLabelsAstArguments = (
  state: PieVisualizationState,
  attributes: Attributes,
  layer: PieLayerState
) => [Ast];

export const getSortedGroups = (
  datasource: DatasourcePublicAPI | undefined,
  layer: PieLayerState,
  accessor: 'primaryGroups' | 'secondaryGroups' = 'primaryGroups'
) => {
  const originalOrder = datasource
    ?.getTableSpec()
    .map(({ columnId }: { columnId: string }) => columnId)
    .filter((columnId: string) => layer[accessor]?.includes(columnId));

  // When we add a column it could be empty, and therefore have no order
  return Array.from(new Set(originalOrder?.concat(layer[accessor] ?? [])));
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
) => {
  return {
    labels: generateCommonLabelsAstArgs(state, attributes, layer),
    buckets: operations
      .filter(({ columnId }) => !isCollapsed(columnId, layer))
      .map(({ columnId }) => columnId)
      .map(prepareDimension),
    metrics: layer.metrics.map(prepareDimension),
    legendDisplay: [attributes.isPreview ? LegendDisplay.HIDE : layer.legendDisplay],
    legendPosition: [layer.legendPosition || Position.Right],
    maxLegendLines: [layer.legendMaxLines ?? 1],
    legendSize: layer.legendSize ? [layer.legendSize] : [],
    nestedLegend: [!!layer.nestedLegend],
    truncateLegend: [
      layer.truncateLegend ?? getDefaultVisualValuesForLayer(state, datasourceLayers).truncateText,
    ],
    palette: generatePaletteAstArguments(paletteService, state.palette),
  };
};

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

const generateMosaicVisAst: GenerateExpressionAstFunction = (...rest) => {
  const { metrics, ...args } = generateCommonArguments(...rest);
  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'mosaicVis',
        arguments: {
          metric: metrics,
          // flip order of bucket dimensions so the rows are fetched before the columns to keep them stable
          buckets: rest[2]
            .filter(({ columnId }) => !isCollapsed(columnId, rest[3]))
            .reverse()
            .map((o) => prepareDimension(o.columnId)),
          ...args,
        },
      },
    ],
  };
};

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
  datasourceLayers: DatasourceLayers,
  paletteService: PaletteRegistry,
  attributes: Attributes = { isPreview: false },
  datasourceExpressionsByLayers: Record<string, Ast>
): Ast | null {
  const layer = state.layers[0];
  const datasource = datasourceLayers[layer.layerId];

  const groups = Array.from(
    new Set(
      [
        getSortedGroups(datasource, layer, 'primaryGroups'),
        layer.secondaryGroups ? getSortedGroups(datasource, layer, 'secondaryGroups') : [],
      ].flat()
    )
  );

  const operations = groups
    .map((columnId) => ({
      columnId,
      operation: datasource?.getOperationForColumnId(columnId) as Operation | null,
    }))
    .filter((o): o is { columnId: string; operation: Operation } => !!o.operation);

  if (!layer.metrics.length || (!operations.length && !layer.allowMultipleMetrics)) {
    return null;
  }
  const visualizationAst = generateExprAst(
    state,
    attributes,
    operations,
    layer,
    datasourceLayers,
    paletteService
  );

  const datasourceAst = datasourceExpressionsByLayers[layer.layerId];
  return {
    type: 'expression',
    chain: [
      ...(datasourceAst ? datasourceAst.chain : []),
      ...groups
        .filter((columnId) => layer.collapseFns?.[columnId])
        .map((columnId) => {
          return {
            type: 'function',
            function: 'lens_collapse',
            arguments: {
              by: groups.filter((chk) => chk !== columnId),
              metric: layer.metrics,
              fn: [layer.collapseFns![columnId]!],
            },
          } as AstFunction;
        }),
      ...(visualizationAst ? visualizationAst.chain : []),
    ],
  };
}

export function toExpression(
  state: PieVisualizationState,
  datasourceLayers: DatasourceLayers,
  paletteService: PaletteRegistry,
  attributes: Partial<{ title: string; description: string }> = {},
  datasourceExpressionsByLayers: Record<string, Ast> | undefined = {}
) {
  return expressionHelper(
    state,
    datasourceLayers,
    paletteService,
    {
      ...attributes,
      isPreview: false,
    },
    datasourceExpressionsByLayers
  );
}

export function toPreviewExpression(
  state: PieVisualizationState,
  datasourceLayers: DatasourceLayers,
  paletteService: PaletteRegistry,
  datasourceExpressionsByLayers: Record<string, Ast> | undefined = {}
) {
  return expressionHelper(
    state,
    datasourceLayers,
    paletteService,
    { isPreview: true },
    datasourceExpressionsByLayers
  );
}
