/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Position } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { PaletteOutput } from 'src/plugins/charts/public';
import { ArgumentType, ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import { LensIconChartArea } from '../assets/chart_area';
import { LensIconChartAreaStacked } from '../assets/chart_area_stacked';
import { LensIconChartAreaPercentage } from '../assets/chart_area_percentage';
import { LensIconChartBar } from '../assets/chart_bar';
import { LensIconChartBarStacked } from '../assets/chart_bar_stacked';
import { LensIconChartBarPercentage } from '../assets/chart_bar_percentage';
import { LensIconChartBarHorizontal } from '../assets/chart_bar_horizontal';
import { LensIconChartBarHorizontalStacked } from '../assets/chart_bar_horizontal_stacked';
import { LensIconChartBarHorizontalPercentage } from '../assets/chart_bar_horizontal_percentage';
import { LensIconChartLine } from '../assets/chart_line';

import { VisualizationType } from '../index';
import { FittingFunction } from './fitting_functions';

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

type LegendConfigResult = LegendConfig & { type: 'lens_xy_legendConfig' };

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

export interface AxesSettingsConfig {
  x: boolean;
  yLeft: boolean;
  yRight: boolean;
}

type TickLabelsConfigResult = AxesSettingsConfig & { type: 'lens_xy_tickLabelsConfig' };

export const tickLabelsConfig: ExpressionFunctionDefinition<
  'lens_xy_tickLabelsConfig',
  null,
  AxesSettingsConfig,
  TickLabelsConfigResult
> = {
  name: 'lens_xy_tickLabelsConfig',
  aliases: [],
  type: 'lens_xy_tickLabelsConfig',
  help: `Configure the xy chart's tick labels appearance`,
  inputTypes: ['null'],
  args: {
    x: {
      types: ['boolean'],
      help: i18n.translate('xpack.lens.xyChart.xAxisTickLabels.help', {
        defaultMessage: 'Specifies whether or not the tick labels of the x-axis are visible.',
      }),
    },
    yLeft: {
      types: ['boolean'],
      help: i18n.translate('xpack.lens.xyChart.yLeftAxisTickLabels.help', {
        defaultMessage: 'Specifies whether or not the tick labels of the left y-axis are visible.',
      }),
    },
    yRight: {
      types: ['boolean'],
      help: i18n.translate('xpack.lens.xyChart.yRightAxisTickLabels.help', {
        defaultMessage: 'Specifies whether or not the tick labels of the right y-axis are visible.',
      }),
    },
  },
  fn: function fn(input: unknown, args: AxesSettingsConfig) {
    return {
      type: 'lens_xy_tickLabelsConfig',
      ...args,
    };
  },
};

type GridlinesConfigResult = AxesSettingsConfig & { type: 'lens_xy_gridlinesConfig' };

export const gridlinesConfig: ExpressionFunctionDefinition<
  'lens_xy_gridlinesConfig',
  null,
  AxesSettingsConfig,
  GridlinesConfigResult
> = {
  name: 'lens_xy_gridlinesConfig',
  aliases: [],
  type: 'lens_xy_gridlinesConfig',
  help: `Configure the xy chart's gridlines appearance`,
  inputTypes: ['null'],
  args: {
    x: {
      types: ['boolean'],
      help: i18n.translate('xpack.lens.xyChart.xAxisGridlines.help', {
        defaultMessage: 'Specifies whether or not the gridlines of the x-axis are visible.',
      }),
    },
    yLeft: {
      types: ['boolean'],
      help: i18n.translate('xpack.lens.xyChart.yLeftAxisgridlines.help', {
        defaultMessage: 'Specifies whether or not the gridlines of the left y-axis are visible.',
      }),
    },
    yRight: {
      types: ['boolean'],
      help: i18n.translate('xpack.lens.xyChart.yRightAxisgridlines.help', {
        defaultMessage: 'Specifies whether or not the gridlines of the right y-axis are visible.',
      }),
    },
  },
  fn: function fn(input: unknown, args: AxesSettingsConfig) {
    return {
      type: 'lens_xy_gridlinesConfig',
      ...args,
    };
  },
};

type AxisTitlesVisibilityConfigResult = AxesSettingsConfig & {
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

interface AxisConfig {
  title: string;
  hide?: boolean;
}

const axisConfig: { [key in keyof AxisConfig]: ArgumentType<AxisConfig[key]> } = {
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

type YConfigResult = YConfig & { type: 'lens_xy_yConfig' };

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
  },
  fn: function fn(input: unknown, args: YConfig) {
    return {
      type: 'lens_xy_yConfig',
      ...args,
    };
  },
};

type LayerConfigResult = LayerArgs & { type: 'lens_xy_layer' };

export const layerConfig: ExpressionFunctionDefinition<
  'lens_xy_layer',
  null,
  LayerArgs,
  LayerConfigResult
> = {
  name: 'lens_xy_layer',
  aliases: [],
  type: 'lens_xy_layer',
  help: `Configure a layer in the xy chart`,
  inputTypes: ['null'],
  args: {
    ...axisConfig,
    layerId: {
      types: ['string'],
      help: '',
    },
    xAccessor: {
      types: ['string'],
      help: '',
    },
    seriesType: {
      types: ['string'],
      options: [
        'bar',
        'line',
        'area',
        'bar_stacked',
        'area_stacked',
        'bar_percentage_stacked',
        'area_percentage_stacked',
      ],
      help: 'The type of chart to display.',
    },
    xScaleType: {
      options: ['ordinal', 'linear', 'time'],
      help: 'The scale type of the x axis',
      default: 'ordinal',
    },
    isHistogram: {
      types: ['boolean'],
      default: false,
      help: 'Whether to layout the chart as a histogram',
    },
    yScaleType: {
      options: ['log', 'sqrt', 'linear', 'time'],
      help: 'The scale type of the y axes',
      default: 'linear',
    },
    splitAccessor: {
      types: ['string'],
      help: 'The column to split by',
      multi: false,
    },
    accessors: {
      types: ['string'],
      help: 'The columns to display on the y axis.',
      multi: true,
    },
    yConfig: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      types: ['lens_xy_yConfig' as any],
      help: 'Additional configuration for y axes',
      multi: true,
    },
    columnToLabel: {
      types: ['string'],
      help: 'JSON key-value pairs of column ID to label',
    },
    palette: {
      default: `{theme "palette" default={system_palette name="default"} }`,
      help: '',
      types: ['palette'],
    },
  },
  fn: function fn(input: unknown, args: LayerArgs) {
    return {
      type: 'lens_xy_layer',
      ...args,
    };
  },
};

export type SeriesType =
  | 'bar'
  | 'bar_horizontal'
  | 'line'
  | 'area'
  | 'bar_stacked'
  | 'bar_percentage_stacked'
  | 'bar_horizontal_stacked'
  | 'bar_horizontal_percentage_stacked'
  | 'area_stacked'
  | 'area_percentage_stacked';

export type YAxisMode = 'auto' | 'left' | 'right';

export type ValueLabelConfig = 'hide' | 'inside' | 'outside';

export interface YConfig {
  forAccessor: string;
  axisMode?: YAxisMode;
  color?: string;
}

export interface LayerConfig {
  hide?: boolean;
  layerId: string;
  xAccessor?: string;
  accessors: string[];
  yConfig?: YConfig[];
  seriesType: SeriesType;
  splitAccessor?: string;
  palette?: PaletteOutput;
}

export interface ValidLayer extends LayerConfig {
  xAccessor: NonNullable<LayerConfig['xAccessor']>;
}

export type LayerArgs = LayerConfig & {
  columnToLabel?: string; // Actually a JSON key-value pair
  yScaleType: 'time' | 'linear' | 'log' | 'sqrt';
  xScaleType: 'time' | 'linear' | 'ordinal';
  isHistogram: boolean;
  // palette will always be set on the expression
  palette: PaletteOutput;
};

// Arguments to XY chart expression, with computed properties
export interface XYArgs {
  title?: string;
  description?: string;
  xTitle: string;
  yTitle: string;
  yRightTitle: string;
  legend: LegendConfig & { type: 'lens_xy_legendConfig' };
  valueLabels: ValueLabelConfig;
  layers: LayerArgs[];
  fittingFunction?: FittingFunction;
  axisTitlesVisibilitySettings?: AxesSettingsConfig & {
    type: 'lens_xy_axisTitlesVisibilityConfig';
  };
  tickLabelsVisibilitySettings?: AxesSettingsConfig & { type: 'lens_xy_tickLabelsConfig' };
  gridlinesVisibilitySettings?: AxesSettingsConfig & { type: 'lens_xy_gridlinesConfig' };
}

// Persisted parts of the state
export interface XYState {
  preferredSeriesType: SeriesType;
  legend: LegendConfig;
  valueLabels?: ValueLabelConfig;
  fittingFunction?: FittingFunction;
  layers: LayerConfig[];
  xTitle?: string;
  yTitle?: string;
  yRightTitle?: string;
  axisTitlesVisibilitySettings?: AxesSettingsConfig;
  tickLabelsVisibilitySettings?: AxesSettingsConfig;
  gridlinesVisibilitySettings?: AxesSettingsConfig;
}

export type State = XYState;

export const visualizationTypes: VisualizationType[] = [
  {
    id: 'bar',
    icon: LensIconChartBar,
    label: i18n.translate('xpack.lens.xyVisualization.barLabel', {
      defaultMessage: 'Bar',
    }),
  },
  {
    id: 'bar_horizontal',
    icon: LensIconChartBarHorizontal,
    label: i18n.translate('xpack.lens.xyVisualization.barHorizontalLabel', {
      defaultMessage: 'H. Bar',
    }),
    fullLabel: i18n.translate('xpack.lens.xyVisualization.barHorizontalFullLabel', {
      defaultMessage: 'Horizontal bar',
    }),
  },
  {
    id: 'bar_stacked',
    icon: LensIconChartBarStacked,
    label: i18n.translate('xpack.lens.xyVisualization.stackedBarLabel', {
      defaultMessage: 'Stacked bar',
    }),
  },
  {
    id: 'bar_percentage_stacked',
    icon: LensIconChartBarPercentage,
    label: i18n.translate('xpack.lens.xyVisualization.stackedPercentageBarLabel', {
      defaultMessage: 'Percentage bar',
    }),
  },
  {
    id: 'bar_horizontal_stacked',
    icon: LensIconChartBarHorizontalStacked,
    label: i18n.translate('xpack.lens.xyVisualization.stackedBarHorizontalLabel', {
      defaultMessage: 'H. Stacked bar',
    }),
    fullLabel: i18n.translate('xpack.lens.xyVisualization.stackedBarHorizontalFullLabel', {
      defaultMessage: 'Horizontal stacked bar',
    }),
  },
  {
    id: 'bar_horizontal_percentage_stacked',
    icon: LensIconChartBarHorizontalPercentage,
    label: i18n.translate('xpack.lens.xyVisualization.stackedPercentageBarHorizontalLabel', {
      defaultMessage: 'H. Percentage bar',
    }),
    fullLabel: i18n.translate(
      'xpack.lens.xyVisualization.stackedPercentageBarHorizontalFullLabel',
      {
        defaultMessage: 'Horizontal percentage bar',
      }
    ),
  },
  {
    id: 'area',
    icon: LensIconChartArea,
    label: i18n.translate('xpack.lens.xyVisualization.areaLabel', {
      defaultMessage: 'Area',
    }),
  },
  {
    id: 'area_stacked',
    icon: LensIconChartAreaStacked,
    label: i18n.translate('xpack.lens.xyVisualization.stackedAreaLabel', {
      defaultMessage: 'Stacked area',
    }),
  },
  {
    id: 'area_percentage_stacked',
    icon: LensIconChartAreaPercentage,
    label: i18n.translate('xpack.lens.xyVisualization.stackedPercentageAreaLabel', {
      defaultMessage: 'Percentage area',
    }),
  },
  {
    id: 'line',
    icon: LensIconChartLine,
    label: i18n.translate('xpack.lens.xyVisualization.lineLabel', {
      defaultMessage: 'Line',
    }),
  },
];
