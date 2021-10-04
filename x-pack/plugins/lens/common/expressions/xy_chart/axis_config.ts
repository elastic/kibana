/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type {
  ArgumentType,
  ExpressionFunctionDefinition,
} from '../../../../../../src/plugins/expressions/common';

export interface AxesSettingsConfig {
  x: boolean;
  yLeft: boolean;
  yRight: boolean;
}

export interface AxisExtentConfig {
  mode: 'full' | 'dataBounds' | 'custom';
  lowerBound?: number;
  upperBound?: number;
}

interface AxisConfig {
  title: string;
  hide?: boolean;
}

export type YAxisMode = 'auto' | 'left' | 'right' | 'bottom';
export type LineStyle = 'solid' | 'dashed' | 'dotted';
export type FillStyle = 'none' | 'above' | 'below';
export type IconPosition = 'auto' | 'left' | 'right' | 'above' | 'below';

export interface YConfig {
  forAccessor: string;
  axisMode?: YAxisMode;
  color?: string;
  icon?: string;
  lineWidth?: number;
  lineStyle?: LineStyle;
  fill?: FillStyle;
  iconPosition?: IconPosition;
}

export type AxisTitlesVisibilityConfigResult = AxesSettingsConfig & {
  type: 'lens_xy_axisTitlesVisibilityConfig';
};

export const axisTitlesVisibilityConfig: ExpressionFunctionDefinition<
  'lens_xy_axisTitlesVisibilityConfig',
  null,
  AxesSettingsConfig,
  AxisTitlesVisibilityConfigResult
> = {
  name: 'lens_xy_axisTitlesVisibilityConfig',
  aliases: [],
  type: 'lens_xy_axisTitlesVisibilityConfig',
  help: `Configure the xy chart's axis titles appearance`,
  inputTypes: ['null'],
  args: {
    x: {
      types: ['boolean'],
      help: i18n.translate('xpack.lens.xyChart.xAxisTitle.help', {
        defaultMessage: 'Specifies whether or not the title of the x-axis are visible.',
      }),
    },
    yLeft: {
      types: ['boolean'],
      help: i18n.translate('xpack.lens.xyChart.yLeftAxisTitle.help', {
        defaultMessage: 'Specifies whether or not the title of the left y-axis are visible.',
      }),
    },
    yRight: {
      types: ['boolean'],
      help: i18n.translate('xpack.lens.xyChart.yRightAxisTitle.help', {
        defaultMessage: 'Specifies whether or not the title of the right y-axis are visible.',
      }),
    },
  },
  fn: function fn(input: unknown, args: AxesSettingsConfig) {
    return {
      type: 'lens_xy_axisTitlesVisibilityConfig',
      ...args,
    };
  },
};

export type AxisExtentConfigResult = AxisExtentConfig & { type: 'lens_xy_axisExtentConfig' };

export const axisExtentConfig: ExpressionFunctionDefinition<
  'lens_xy_axisExtentConfig',
  null,
  AxisExtentConfig,
  AxisExtentConfigResult
> = {
  name: 'lens_xy_axisExtentConfig',
  aliases: [],
  type: 'lens_xy_axisExtentConfig',
  help: `Configure the xy chart's axis extents`,
  inputTypes: ['null'],
  args: {
    mode: {
      types: ['string'],
      options: ['full', 'dataBounds', 'custom'],
      help: i18n.translate('xpack.lens.xyChart.extentMode.help', {
        defaultMessage: 'The extent mode',
      }),
    },
    lowerBound: {
      types: ['number'],
      help: i18n.translate('xpack.lens.xyChart.extentMode.help', {
        defaultMessage: 'The extent mode',
      }),
    },
    upperBound: {
      types: ['number'],
      help: i18n.translate('xpack.lens.xyChart.extentMode.help', {
        defaultMessage: 'The extent mode',
      }),
    },
  },
  fn: function fn(input: unknown, args: AxisExtentConfig) {
    return {
      type: 'lens_xy_axisExtentConfig',
      ...args,
    };
  },
};

export const axisConfig: { [key in keyof AxisConfig]: ArgumentType<AxisConfig[key]> } = {
  title: {
    types: ['string'],
    help: i18n.translate('xpack.lens.xyChart.title.help', {
      defaultMessage: 'The axis title',
    }),
  },
  hide: {
    types: ['boolean'],
    default: false,
    help: 'Show / hide axis',
  },
};

export type YConfigResult = YConfig & { type: 'lens_xy_yConfig' };

export const yAxisConfig: ExpressionFunctionDefinition<
  'lens_xy_yConfig',
  null,
  YConfig,
  YConfigResult
> = {
  name: 'lens_xy_yConfig',
  aliases: [],
  type: 'lens_xy_yConfig',
  help: `Configure the behavior of a xy chart's y axis metric`,
  inputTypes: ['null'],
  args: {
    forAccessor: {
      types: ['string'],
      help: 'The accessor this configuration is for',
    },
    axisMode: {
      types: ['string'],
      options: ['auto', 'left', 'right'],
      help: 'The axis mode of the metric',
    },
    color: {
      types: ['string'],
      help: 'The color of the series',
    },
    lineStyle: {
      types: ['string'],
      options: ['solid', 'dotted', 'dashed'],
      help: 'The style of the threshold line',
    },
    lineWidth: {
      types: ['number'],
      help: 'The width of the threshold line',
    },
    icon: {
      types: ['string'],
      help: 'An optional icon used for threshold lines',
    },
    iconPosition: {
      types: ['string'],
      options: ['auto', 'above', 'below', 'left', 'right'],
      help: 'The placement of the icon for the threshold line',
    },
    fill: {
      types: ['string'],
      options: ['none', 'above', 'below'],
      help: '',
    },
  },
  fn: function fn(input: unknown, args: YConfig) {
    return {
      type: 'lens_xy_yConfig',
      ...args,
    };
  },
};
