/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ast } from '@kbn/interpreter';
import { Position } from '@elastic/charts';
import { PaletteOutput, PaletteRegistry } from '@kbn/coloring';

import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/public';
import type {
  LabelPositions,
  MosaicVisExpressionFunctionDefinition,
  PartitionLabelsExpressionFunctionDefinition,
  PieVisExpressionFunctionDefinition,
  TreemapVisExpressionFunctionDefinition,
  ValueFormats,
  LegendDisplay as PartitionVisLegendDisplay,
  WaffleVisExpressionFunctionDefinition,
} from '@kbn/expression-partition-vis-plugin/common';
import { ExpressionFunctionTheme } from '@kbn/expressions-plugin/common';
import { ExpressionFunctionVisDimension } from '@kbn/visualizations-plugin/common';
import type { CollapseExpressionFunction } from '../../../common/expressions';
import type { Operation, DatasourcePublicAPI, DatasourceLayers } from '../../types';
import { DEFAULT_PERCENT_DECIMALS } from './constants';
import { shouldShowValuesInLegend } from './render_helpers';
import { PieLayerState, PieVisualizationState, EmptySizeRatios } from '../../../common/types';
import {
  CategoryDisplay,
  LegendDisplay,
  NumberDisplay,
  PieChartTypes,
} from '../../../common/constants';
import { getDefaultVisualValuesForLayer } from '../../shared_components/datasource_default_values';
import { hasNonCollapsedSliceBy, isCollapsed } from './visualization';

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

type GenerateLabelsAstArguments = (
  state: PieVisualizationState,
  attributes: Attributes,
  layer: PieLayerState,
  columnToLabelMap: Record<string, string>
) => [Ast];

export const getColumnToLabelMap = (
  columnIds: string[],
  datasource: DatasourcePublicAPI | undefined
) => {
  const columnToLabel: Record<string, string> = {};
  columnIds.forEach((accessor) => {
    const operation = datasource?.getOperationForColumnId(accessor);
    if (operation?.label) {
      columnToLabel[accessor] = operation.label;
    }
  });
  return columnToLabel;
};

export const getSortedAccessorsForGroup = (
  datasource: DatasourcePublicAPI | undefined,
  layer: PieLayerState,
  accessor: 'primaryGroups' | 'secondaryGroups' | 'metrics'
) => {
  const originalOrder = datasource
    ?.getTableSpec()
    .map(({ columnId }: { columnId: string }) => columnId)
    .filter((columnId: string) => layer[accessor]?.includes(columnId));

  // When we add a column it could be empty, and therefore have no order
  return Array.from(new Set(originalOrder?.concat(layer[accessor] ?? [])));
};

const prepareDimension = (accessor: string) =>
  buildExpression([
    buildExpressionFunction<ExpressionFunctionVisDimension>('visdimension', { accessor }),
  ]).toAst();

const generateCommonLabelsAstArgs: GenerateLabelsAstArguments = (
  state,
  attributes,
  layer,
  columnToLabelMap
) => {
  const show = !attributes.isPreview && layer.categoryDisplay !== CategoryDisplay.HIDE;
  const position =
    layer.categoryDisplay !== CategoryDisplay.HIDE ? (layer.categoryDisplay as LabelPositions) : [];
  const values = layer.numberDisplay !== NumberDisplay.HIDDEN;
  const valuesFormat =
    layer.numberDisplay !== NumberDisplay.HIDDEN ? (layer.numberDisplay as ValueFormats) : [];
  const percentDecimals = layer.percentDecimals ?? DEFAULT_PERCENT_DECIMALS;
  const colorOverrides =
    layer.allowMultipleMetrics && !hasNonCollapsedSliceBy(layer)
      ? Object.entries(columnToLabelMap).reduce<Record<string, string>>(
          (acc, [columnId, label]) => {
            const color = layer.colorsByDimension?.[columnId];
            if (color) {
              acc[label] = color;
            }
            return acc;
          },
          {}
        )
      : {};

  const partitionLabelsFn = buildExpressionFunction<PartitionLabelsExpressionFunctionDefinition>(
    'partitionLabels',
    {
      show,
      position,
      values,
      valuesFormat,
      percentDecimals,
      colorOverrides: JSON.stringify(colorOverrides),
    }
  );

  return [buildExpression([partitionLabelsFn]).toAst()];
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
        buildExpression([
          buildExpressionFunction<ExpressionFunctionTheme>('theme', {
            variable: 'palette',
            default: paletteService.get(palette.name).toExpression(palette.params),
          }),
        ]).toAst(),
      ]
    : [paletteService.get('default').toExpression()];

const generateCommonArguments = (
  state: PieVisualizationState,
  attributes: Attributes,
  operations: OperationColumnId[],
  layer: PieLayerState,
  datasourceLayers: DatasourceLayers,
  paletteService: PaletteRegistry
) => {
  const datasource = datasourceLayers[layer.layerId];
  const columnToLabelMap = getColumnToLabelMap(layer.metrics, datasource);
  const sortedMetricAccessors = getSortedAccessorsForGroup(datasource, layer, 'metrics');
  return {
    labels: generateCommonLabelsAstArgs(state, attributes, layer, columnToLabelMap),
    buckets: operations
      .filter(({ columnId }) => !isCollapsed(columnId, layer))
      .map(({ columnId }) => columnId)
      .map(prepareDimension),
    metrics: (layer.allowMultipleMetrics ? sortedMetricAccessors : [sortedMetricAccessors[0]]).map(
      prepareDimension
    ),
    metricsToLabels: JSON.stringify(columnToLabelMap),
    legendDisplay: (attributes.isPreview
      ? LegendDisplay.HIDE
      : layer.legendDisplay) as PartitionVisLegendDisplay,
    legendPosition: layer.legendPosition || Position.Right,
    maxLegendLines: layer.legendMaxLines ?? 1,
    legendSize: layer.legendSize,
    nestedLegend:
      layer.primaryGroups.length + (layer.secondaryGroups?.length ?? 0) > 1
        ? Boolean(layer.nestedLegend)
        : false,
    truncateLegend:
      layer.truncateLegend ?? getDefaultVisualValuesForLayer(state, datasourceLayers).truncateText,
    palette: generatePaletteAstArguments(paletteService, state.palette),
    addTooltip: true,
    colorMapping: layer.colorMapping ? JSON.stringify(layer.colorMapping) : undefined,
  };
};

const generatePieVisAst: GenerateExpressionAstFunction = (...rest) =>
  buildExpression([
    buildExpressionFunction<PieVisExpressionFunctionDefinition>('pieVis', {
      ...generateCommonArguments(...rest),
      respectSourceOrder: false,
      startFromSecondLargestSlice: true,
      isDonut: false,
    }),
  ]).toAst();

const generateDonutVisAst: GenerateExpressionAstFunction = (...rest) => {
  const [, , , layer] = rest;

  return buildExpression([
    buildExpressionFunction<PieVisExpressionFunctionDefinition>('pieVis', {
      ...generateCommonArguments(...rest),
      respectSourceOrder: false,
      isDonut: true,
      startFromSecondLargestSlice: true,
      emptySizeRatio: layer.emptySizeRatio ?? EmptySizeRatios.SMALL,
    }),
  ]).toAst();
};

const generateTreemapVisAst: GenerateExpressionAstFunction = (...rest) => {
  const [, , , layer] = rest;

  return buildExpression([
    buildExpressionFunction<TreemapVisExpressionFunctionDefinition>('treemapVis', {
      ...generateCommonArguments(...rest),
      nestedLegend: !!layer.nestedLegend,
    }),
  ]).toAst();
};

const generateMosaicVisAst: GenerateExpressionAstFunction = (...rest) => {
  const { metrics, ...args } = generateCommonArguments(...rest);

  return buildExpression([
    buildExpressionFunction<MosaicVisExpressionFunctionDefinition>('mosaicVis', {
      ...{ ...args, metricsToLabels: undefined },
      metric: metrics,
      // flip order of bucket dimensions so the rows are fetched before the columns to keep them stable
      buckets: rest[2]
        .filter(({ columnId }) => !isCollapsed(columnId, rest[3]))
        .reverse()
        .map((o) => o.columnId)
        .map(prepareDimension),
    }),
  ]).toAst();
};

const generateWaffleVisAst: GenerateExpressionAstFunction = (...rest) => {
  const { buckets, nestedLegend, ...args } = generateCommonArguments(...rest);
  const [state, attributes, , layer, datasourceLayers] = rest;

  return buildExpression([
    buildExpressionFunction<WaffleVisExpressionFunctionDefinition>('waffleVis', {
      ...args,
      bucket: buckets,
      labels: generateWaffleLabelsAstArguments(
        state,
        attributes,
        layer,
        getColumnToLabelMap(layer.metrics, datasourceLayers[layer.layerId])
      ),
      showValuesInLegend: shouldShowValuesInLegend(layer, state.shape),
    }),
  ]).toAst();
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

  const accessors = Array.from(
    new Set(
      [
        getSortedAccessorsForGroup(datasource, layer, 'primaryGroups'),
        layer.secondaryGroups
          ? getSortedAccessorsForGroup(datasource, layer, 'secondaryGroups')
          : [],
      ].flat()
    )
  );

  const operations = accessors
    .map((columnId) => ({
      columnId,
      operation: datasource?.getOperationForColumnId(columnId) as Operation | null,
    }))
    .filter((o): o is { columnId: string; operation: Operation } => !!o.operation);

  if (!layer.metrics.length) {
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
      ...accessors
        .filter((columnId) => layer.collapseFns?.[columnId])
        .map((columnId) => {
          return buildExpressionFunction<CollapseExpressionFunction>('lens_collapse', {
            by: accessors.filter((chk) => chk !== columnId),
            metric: layer.metrics,
            fn: [layer.collapseFns![columnId]!],
          }).toAst();
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
