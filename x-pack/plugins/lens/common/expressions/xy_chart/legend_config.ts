/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HorizontalAlignment, Position, VerticalAlignment } from '@elastic/charts';
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
  /**
   * Flag whether the legend is inside the chart
   */
  isInside?: boolean;
  /**
   * Horizontal Alignment of the legend when it is set inside chart
   */
  horizontalAlignment?: HorizontalAlignment;
  /**
   * Vertical Alignment of the legend when it is set inside chart
   */
  verticalAlignment?: VerticalAlignment;
  /**
   * Number of columns when legend is set inside chart
   */
  floatingColumns?: number;
  /**
   * Maximum number of lines per legend item
   */
  maxLines?: number;
  /**
   * Flag whether the legend items are truncated or not
   */
  shouldTruncate?: boolean;
  /**
   * Exact legend width (vertical) or height (horizontal)
   * Limited to max of 70% of the chart container dimension Vertical legends limited to min of 30% of computed width
   */
  legendSize?: number;
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
    isInside: {
      types: ['boolean'],
      help: i18n.translate('xpack.lens.xyChart.isInside.help', {
        defaultMessage: 'Specifies whether a legend is inside the chart',
      }),
    },
    horizontalAlignment: {
      types: ['string'],
      options: [HorizontalAlignment.Right, HorizontalAlignment.Left],
      help: i18n.translate('xpack.lens.xyChart.horizontalAlignment.help', {
        defaultMessage:
          'Specifies the horizontal alignment of the legend when it is displayed inside chart.',
      }),
    },
    verticalAlignment: {
      types: ['string'],
      options: [VerticalAlignment.Top, VerticalAlignment.Bottom],
      help: i18n.translate('xpack.lens.xyChart.verticalAlignment.help', {
        defaultMessage:
          'Specifies the vertical alignment of the legend when it is displayed inside chart.',
      }),
    },
    floatingColumns: {
      types: ['number'],
      help: i18n.translate('xpack.lens.xyChart.floatingColumns.help', {
        defaultMessage: 'Specifies the number of columns when legend is displayed inside chart.',
      }),
    },
    maxLines: {
      types: ['number'],
      help: i18n.translate('xpack.lens.xyChart.maxLines.help', {
        defaultMessage: 'Specifies the number of lines per legend item.',
      }),
    },
    shouldTruncate: {
      types: ['boolean'],
      default: true,
      help: i18n.translate('xpack.lens.xyChart.shouldTruncate.help', {
        defaultMessage: 'Specifies whether the legend items will be truncated or not',
      }),
    },
    legendSize: {
      types: ['number'],
      help: i18n.translate('xpack.lens.xyChart.legendSize.help', {
        defaultMessage: 'Specifies the legend size in pixels.',
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
