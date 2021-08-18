/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionDefinition } from '../../../../../../src/plugins/expressions/common';
import type { PaletteOutput } from '../../../../../../src/plugins/charts/common';
import type { LensMultiTable, CustomPaletteParams } from '../../types';
import { HeatmapGridConfigResult, HEATMAP_GRID_FUNCTION } from './heatmap_grid';
import { HeatmapLegendConfigResult, HEATMAP_LEGEND_FUNCTION } from './heatmap_legend';

export const HEATMAP_FUNCTION = 'lens_heatmap';
export const HEATMAP_FUNCTION_RENDERER = 'lens_heatmap_renderer';

export type ChartShapes = 'heatmap';

export interface SharedHeatmapLayerState {
  shape: ChartShapes;
  xAccessor?: string;
  yAccessor?: string;
  valueAccessor?: string;
  legend: HeatmapLegendConfigResult;
  gridConfig: HeatmapGridConfigResult;
}

export type HeatmapLayerState = SharedHeatmapLayerState & {
  layerId: string;
};

export type HeatmapVisualizationState = HeatmapLayerState & {
  // need to store the current accessor to reset the color stops at accessor change
  palette?: PaletteOutput<CustomPaletteParams> & { accessor: string };
};

export type HeatmapExpressionArgs = SharedHeatmapLayerState & {
  title?: string;
  description?: string;
  palette: PaletteOutput;
};

export interface HeatmapRender {
  type: 'render';
  as: typeof HEATMAP_FUNCTION_RENDERER;
  value: HeatmapExpressionProps;
}

export interface HeatmapExpressionProps {
  data: LensMultiTable;
  args: HeatmapExpressionArgs;
}

export const heatmap: ExpressionFunctionDefinition<
  typeof HEATMAP_FUNCTION,
  LensMultiTable,
  HeatmapExpressionArgs,
  HeatmapRender
> = {
  name: HEATMAP_FUNCTION,
  type: 'render',
  help: i18n.translate('xpack.lens.heatmap.expressionHelpLabel', {
    defaultMessage: 'Heatmap renderer',
  }),
  args: {
    title: {
      types: ['string'],
      help: i18n.translate('xpack.lens.heatmap.titleLabel', {
        defaultMessage: 'Title',
      }),
    },
    description: {
      types: ['string'],
      help: '',
    },
    xAccessor: {
      types: ['string'],
      help: '',
    },
    yAccessor: {
      types: ['string'],
      help: '',
    },
    valueAccessor: {
      types: ['string'],
      help: '',
    },
    shape: {
      types: ['string'],
      help: '',
    },
    palette: {
      default: `{theme "palette" default={system_palette name="default"} }`,
      help: '',
      types: ['palette'],
    },
    legend: {
      types: [HEATMAP_LEGEND_FUNCTION],
      help: i18n.translate('xpack.lens.heatmapChart.legend.help', {
        defaultMessage: 'Configure the chart legend.',
      }),
    },
    gridConfig: {
      types: [HEATMAP_GRID_FUNCTION],
      help: i18n.translate('xpack.lens.heatmapChart.gridConfig.help', {
        defaultMessage: 'Configure the heatmap layout.',
      }),
    },
  },
  inputTypes: ['lens_multitable'],
  fn(data: LensMultiTable, args: HeatmapExpressionArgs) {
    return {
      type: 'render',
      as: HEATMAP_FUNCTION_RENDERER,
      value: {
        data,
        args,
      },
    };
  },
};
