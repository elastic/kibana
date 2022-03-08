/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { layerTypes } from '../../../constants';
import type { PaletteOutput } from '../../../../../../../src/plugins/charts/common';
import type { ExpressionFunctionDefinition } from '../../../../../../../src/plugins/expressions/common';
import { axisConfig, YConfig } from '../axis_config';
import type { SeriesType } from '../series_type';

export interface XYDataLayerConfig {
  layerId: string;
  layerType: typeof layerTypes.DATA;
  accessors: string[];
  seriesType: SeriesType;
  xAccessor?: string;
  hide?: boolean;
  yConfig?: YConfig[];
  splitAccessor?: string;
  palette?: PaletteOutput;
}
export interface ValidLayer extends XYDataLayerConfig {
  xAccessor: NonNullable<XYDataLayerConfig['xAccessor']>;
}

export type DataLayerArgs = XYDataLayerConfig & {
  columnToLabel?: string; // Actually a JSON key-value pair
  yScaleType: 'time' | 'linear' | 'log' | 'sqrt';
  xScaleType: 'time' | 'linear' | 'ordinal';
  isHistogram: boolean;
  // palette will always be set on the expression
  palette: PaletteOutput;
};

export type DataLayerConfigResult = DataLayerArgs & { type: 'lens_xy_data_layer' };

export const dataLayerConfig: ExpressionFunctionDefinition<
  'lens_xy_data_layer',
  null,
  DataLayerArgs,
  DataLayerConfigResult
> = {
  name: 'lens_xy_data_layer',
  aliases: [],
  type: 'lens_xy_data_layer',
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
    layerType: { types: ['string'], options: [layerTypes.DATA], help: '' },
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
  fn: function fn(input: unknown, args: DataLayerArgs) {
    return {
      type: 'lens_xy_data_layer',
      ...args,
    };
  },
};
