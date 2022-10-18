/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomPaletteParams, CUSTOM_PALETTE, PaletteRegistry } from '@kbn/coloring';
import {
  EXPRESSION_METRIC_NAME,
  EXPRESSION_METRIC_TRENDLINE_NAME,
} from '@kbn/expression-metric-vis-plugin/public';
import { buildExpressionFunction } from '@kbn/expressions-plugin/common';
import { Ast } from '@kbn/interpreter';
import { CollapseArgs, CollapseFunction } from '../../../common/expressions';
import { CollapseExpressionFunction } from '../../../common/expressions/collapse/types';
import { DatasourceLayers } from '../../types';
import { showingBar } from './metric_visualization';
import { DEFAULT_MAX_COLUMNS, getDefaultColor, MetricVisualizationState } from './visualization';

// TODO - deduplicate with gauges?
function computePaletteParams(params: CustomPaletteParams) {
  return {
    ...params,
    // rewrite colors and stops as two distinct arguments
    colors: (params?.stops || []).map(({ color }) => color),
    stops: params?.name === 'custom' ? (params?.stops || []).map(({ stop }) => stop) : [],
    reverse: false, // managed at UI level
  };
}

const getTrendlineExpression = (
  state: MetricVisualizationState,
  datasourceExpressionsByLayers: Record<string, Ast>
): Ast | undefined => {
  if (!state.trendlineLayerId || !state.trendlineMetricAccessor || !state.trendlineTimeAccessor) {
    return;
  }

  const datasourceExpression = datasourceExpressionsByLayers[state.trendlineLayerId];

  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: EXPRESSION_METRIC_TRENDLINE_NAME,
        arguments: {
          metric: [state.trendlineMetricAccessor],
          timeField: [state.trendlineTimeAccessor],
          breakdownBy:
            state.trendlineBreakdownByAccessor && !state.collapseFn
              ? [state.trendlineBreakdownByAccessor]
              : [],
          inspectorTableId: [state.trendlineLayerId],
          ...(datasourceExpression
            ? {
                table: [
                  {
                    ...datasourceExpression,
                    chain: [
                      ...datasourceExpression.chain,
                      ...(state.collapseFn
                        ? [
                            buildExpressionFunction<CollapseExpressionFunction>('lens_collapse', {
                              by: [state.trendlineTimeAccessor],
                              metric: [state.trendlineMetricAccessor],
                              fn: [state.collapseFn],
                            }).toAst(),
                          ]
                        : []),
                    ],
                  },
                ],
              }
            : {}),
        },
      },
    ],
  };
};

export const toExpression = (
  paletteService: PaletteRegistry,
  state: MetricVisualizationState,
  datasourceLayers: DatasourceLayers,
  datasourceExpressionsByLayers: Record<string, Ast> | undefined = {}
): Ast | null => {
  if (!state.metricAccessor) {
    return null;
  }

  const datasource = datasourceLayers[state.layerId];
  const datasourceExpression = datasourceExpressionsByLayers[state.layerId];

  const maxPossibleTiles =
    // if there's a collapse function, no need to calculate since we're dealing with a single tile
    state.breakdownByAccessor && !state.collapseFn
      ? datasource?.getMaxPossibleNumValues(state.breakdownByAccessor)
      : null;

  const getCollapseFnArguments = (): CollapseArgs => {
    const metric = [state.metricAccessor, state.secondaryMetricAccessor, state.maxAccessor].filter(
      Boolean
    ) as string[];

    const collapseFn = state.collapseFn as CollapseFunction;

    const fn = metric.map((accessor) => {
      if (accessor !== state.maxAccessor) {
        return collapseFn;
      } else {
        const isMaxStatic = Boolean(
          datasource?.getOperationForColumnId(state.maxAccessor!)?.isStaticValue
        );
        // we do this because the user expects the static value they set to be the same
        // even if they define a collapse on the breakdown by
        return isMaxStatic ? 'max' : collapseFn;
      }
    });

    return {
      by: [],
      metric,
      fn,
    };
  };

  const collapseExpressionFunction = state.collapseFn
    ? buildExpressionFunction<CollapseExpressionFunction>(
        'lens_collapse',
        getCollapseFnArguments()
      ).toAst()
    : undefined;

  const trendlineExpression = getTrendlineExpression(state, datasourceExpressionsByLayers);

  return {
    type: 'expression',
    chain: [
      ...(datasourceExpression?.chain ?? []),
      ...(collapseExpressionFunction ? [collapseExpressionFunction] : []),
      {
        type: 'function',
        function: EXPRESSION_METRIC_NAME,
        arguments: {
          metric: state.metricAccessor ? [state.metricAccessor] : [],
          secondaryMetric: state.secondaryMetricAccessor ? [state.secondaryMetricAccessor] : [],
          secondaryPrefix:
            typeof state.secondaryPrefix !== 'undefined' ? [state.secondaryPrefix] : [],
          max: showingBar(state) ? [state.maxAccessor] : [],
          breakdownBy:
            state.breakdownByAccessor && !state.collapseFn ? [state.breakdownByAccessor] : [],
          trendline: trendlineExpression ? [trendlineExpression] : [],
          subtitle: state.subtitle ? [state.subtitle] : [],
          progressDirection: state.progressDirection ? [state.progressDirection] : [],
          color: [state.color || getDefaultColor(state)],
          palette: state.palette?.params
            ? [
                paletteService
                  .get(CUSTOM_PALETTE)
                  .toExpression(computePaletteParams(state.palette.params as CustomPaletteParams)),
              ]
            : [],
          maxCols: [state.maxCols ?? DEFAULT_MAX_COLUMNS],
          minTiles: maxPossibleTiles ? [maxPossibleTiles] : [],
          inspectorTableId: [state.layerId],
        },
      },
    ],
  };
};
