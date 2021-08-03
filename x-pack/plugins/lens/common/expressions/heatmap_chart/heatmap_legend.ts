/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Position } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionDefinition } from '../../../../../../src/plugins/expressions/common';

export const HEATMAP_LEGEND_FUNCTION = 'lens_heatmap_legendConfig';

export interface HeatmapLegendConfig {
  /**
   * Flag whether the legend should be shown. If there is just a single series, it will be hidden
   */
  isVisible: boolean;
  /**
   * Position of the legend relative to the chart
   */
  position: Position;
}

export type HeatmapLegendConfigResult = HeatmapLegendConfig & {
  type: typeof HEATMAP_LEGEND_FUNCTION;
};

/**
 * TODO check if it's possible to make a shared function
 * based on the XY chart
 */
export const heatmapLegendConfig: ExpressionFunctionDefinition<
  typeof HEATMAP_LEGEND_FUNCTION,
  null,
  HeatmapLegendConfig,
  HeatmapLegendConfigResult
> = {
  name: HEATMAP_LEGEND_FUNCTION,
  aliases: [],
  type: HEATMAP_LEGEND_FUNCTION,
  help: `Configure the heatmap chart's legend`,
  inputTypes: ['null'],
  args: {
    isVisible: {
      types: ['boolean'],
      help: i18n.translate('xpack.lens.heatmapChart.legend.isVisible.help', {
        defaultMessage: 'Specifies whether or not the legend is visible.',
      }),
    },
    position: {
      types: ['string'],
      options: [Position.Top, Position.Right, Position.Bottom, Position.Left],
      help: i18n.translate('xpack.lens.heatmapChart.legend.position.help', {
        defaultMessage: 'Specifies the legend position.',
      }),
    },
  },
  fn(input, args) {
    return {
      type: HEATMAP_LEGEND_FUNCTION,
      ...args,
    };
  },
};
