/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/common';
import { SystemPaletteExpressionFunctionDefinition } from '@kbn/charts-plugin/common';
import { PaletteRegistry } from '@kbn/coloring';
import {
  buildExpression,
  buildExpressionFunction,
  ExpressionFunctionTheme,
} from '@kbn/expressions-plugin/common';
import type { Ast } from '@kbn/interpreter';
import { GraphDecorationFunction } from './expression_decoration_fn';
import type { GraphChartConfigFn } from './expression_fn';
import type { GraphState } from './types';

export const toExpression = (
  state: GraphState,
  datasourceExpressionsByLayers: Record<string, Ast>,
  paletteService: PaletteRegistry
) => {
  if (!state.accessor || !state.metrics?.length) {
    return null;
  }

  return {
    type: 'expression' as const,
    chain: [
      ...Object.values(datasourceExpressionsByLayers || {})[0].chain,
      buildExpressionFunction<GraphChartConfigFn>('lens_graph_chart', {
        title: '',
        description: '',
        layerId: state.layerId,
        accessor: state.accessor || '',
        metrics: state.metrics,
        metricConfig:
          state.metricConfig?.map(({ metricId, mapValuesTo, palette }) => {
            const paletteParams = {
              ...palette?.params,
              // rewrite colors and stops as two distinct arguments
              colors: (palette?.params?.stops || []).map(({ color }) => color),
              stops:
                palette?.params?.name === 'custom'
                  ? (palette?.params?.stops || []).map(({ stop }) => stop)
                  : [],
              reverse: false, // managed at UI level
            };
            return buildExpression([
              buildExpressionFunction<GraphDecorationFunction>('lens_graph_decoration', {
                metricId,
                mapValuesTo: mapValuesTo || 'size',
                palette:
                  mapValuesTo !== 'color'
                    ? []
                    : paletteService.get('custom').toExpression(paletteParams),
                maxWidth: 25,
              }),
            ]).toAst();
          }) || [],
        palette: buildExpression([
          state.palette
            ? buildExpressionFunction<ExpressionFunctionTheme>('theme', {
                variable: 'palette',
                default: [
                  paletteService.get(state.palette.name).toExpression(state.palette.params),
                ],
              })
            : buildExpressionFunction<SystemPaletteExpressionFunctionDefinition>('system_palette', {
                name: 'default',
              }),
        ]).toAst(),
      }).toAst(),
      //   decorations: state.metricConfig?.map(
      //     (config) => metricsConfigToDataDecorationsConfigExpression(config),
      //     'aaa'
      //   ),
      // },
      // },
    ],
  };
};

// const metricsConfigToDataDecorationsConfigExpression = (
//   metricConfig: MetricConfig,
//   defaultColor?: string
// ) => {
//   const metricsDecorationConfigFn = buildExpressionFunction<MetricsDecorationConfigFn>(
//     'metricsDecorationConfig',
//     {
//       metricId: metricConfig.metricId,
//       color: metricConfig.color ?? defaultColor,
//     }
//   );
//   return buildExpression([metricsDecorationConfigFn]).toAst();
// };
