/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Position } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionDefinition } from '../../../../../../src/plugins/expressions/common';

export interface LegendConfig {
  /**
   * Flag whether the legend should be shown. If there is just a single series, it will be hidden
   */
  isVisible: boolean;
  /**
   * Position of the legend relative to the chart
   */
  position: Position;
  /**
   * Flag whether the legend should be shown even with just a single series
   */
  showSingleSeries?: boolean;
}

export type LegendConfigResult = LegendConfig & { type: 'lens_xy_legendConfig' };

export const legendConfig: ExpressionFunctionDefinition<
  'lens_xy_legendConfig',
  null,
  LegendConfig,
  LegendConfigResult
> = {
  name: 'lens_xy_legendConfig',
  aliases: [],
  type: 'lens_xy_legendConfig',
  help: `Configure the xy chart's legend`,
  inputTypes: ['null'],
  args: {
    isVisible: {
      types: ['boolean'],
      help: i18n.translate('xpack.lens.xyChart.isVisible.help', {
        defaultMessage: 'Specifies whether or not the legend is visible.',
      }),
    },
    position: {
      types: ['string'],
      options: [Position.Top, Position.Right, Position.Bottom, Position.Left],
      help: i18n.translate('xpack.lens.xyChart.position.help', {
        defaultMessage: 'Specifies the legend position.',
      }),
    },
    showSingleSeries: {
      types: ['boolean'],
      help: i18n.translate('xpack.lens.xyChart.showSingleSeries.help', {
        defaultMessage: 'Specifies whether a legend with just a single entry should be shown',
      }),
    },
  },
  fn: function fn(input: unknown, args: LegendConfig) {
    return {
      type: 'lens_xy_legendConfig',
      ...args,
    };
  },
};
