/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionDefinition } from '../../../../../../src/plugins/expressions/common';

export const HEATMAP_GRID_FUNCTION = 'lens_heatmap_grid';

export interface HeatmapGridConfig {
  // grid
  strokeWidth?: number;
  strokeColor?: string;
  cellHeight?: number;
  cellWidth?: number;
  // cells
  isCellLabelVisible: boolean;
  // Y-axis
  isYAxisLabelVisible: boolean;
  yAxisLabelWidth?: number;
  yAxisLabelColor?: string;
  // X-axis
  isXAxisLabelVisible: boolean;
}

export type HeatmapGridConfigResult = HeatmapGridConfig & { type: typeof HEATMAP_GRID_FUNCTION };

export const heatmapGridConfig: ExpressionFunctionDefinition<
  typeof HEATMAP_GRID_FUNCTION,
  null,
  HeatmapGridConfig,
  HeatmapGridConfigResult
> = {
  name: HEATMAP_GRID_FUNCTION,
  aliases: [],
  type: HEATMAP_GRID_FUNCTION,
  help: `Configure the heatmap layout `,
  inputTypes: ['null'],
  args: {
    // grid
    strokeWidth: {
      types: ['number'],
      help: i18n.translate('xpack.lens.heatmapChart.config.strokeWidth.help', {
        defaultMessage: 'Specifies the grid stroke width',
      }),
      required: false,
    },
    strokeColor: {
      types: ['string'],
      help: i18n.translate('xpack.lens.heatmapChart.config.strokeColor.help', {
        defaultMessage: 'Specifies the grid stroke color',
      }),
      required: false,
    },
    cellHeight: {
      types: ['number'],
      help: i18n.translate('xpack.lens.heatmapChart.config.cellHeight.help', {
        defaultMessage: 'Specifies the grid cell height',
      }),
      required: false,
    },
    cellWidth: {
      types: ['number'],
      help: i18n.translate('xpack.lens.heatmapChart.config.cellWidth.help', {
        defaultMessage: 'Specifies the grid cell width',
      }),
      required: false,
    },
    // cells
    isCellLabelVisible: {
      types: ['boolean'],
      help: i18n.translate('xpack.lens.heatmapChart.config.isCellLabelVisible.help', {
        defaultMessage: 'Specifies whether or not the cell label is visible.',
      }),
    },
    // Y-axis
    isYAxisLabelVisible: {
      types: ['boolean'],
      help: i18n.translate('xpack.lens.heatmapChart.config.isYAxisLabelVisible.help', {
        defaultMessage: 'Specifies whether or not the Y-axis labels are visible.',
      }),
    },
    yAxisLabelWidth: {
      types: ['number'],
      help: i18n.translate('xpack.lens.heatmapChart.config.yAxisLabelWidth.help', {
        defaultMessage: 'Specifies the width of the Y-axis labels.',
      }),
      required: false,
    },
    yAxisLabelColor: {
      types: ['string'],
      help: i18n.translate('xpack.lens.heatmapChart.config.yAxisLabelColor.help', {
        defaultMessage: 'Specifies the color of the Y-axis labels.',
      }),
      required: false,
    },
    // X-axis
    isXAxisLabelVisible: {
      types: ['boolean'],
      help: i18n.translate('xpack.lens.heatmapChart.config.isXAxisLabelVisible.help', {
        defaultMessage: 'Specifies whether or not the X-axis labels are visible.',
      }),
    },
  },
  fn(input, args) {
    return {
      type: HEATMAP_GRID_FUNCTION,
      ...args,
    };
  },
};
