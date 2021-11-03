/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PaletteOutput } from '../../../../../../src/plugins/charts/common';
import type { ExpressionFunctionDefinition } from '../../../../../../src/plugins/expressions/common';
import type { LayerType } from '../../types';
import { layerTypes } from '../../constants';
import { axisConfig, YConfig } from './axis_config';
import type { SeriesType } from './series_type';

export interface XYLayerConfig {
  hide?: boolean;
  layerId: string;
  xAccessor?: string;
  accessors: string[];
  yConfig?: YConfig[];
  seriesType: SeriesType;
  splitAccessor?: string;
  palette?: PaletteOutput;
  layerType: LayerType;
}

export interface ValidLayer extends XYLayerConfig {
  xAccessor: NonNullable<XYLayerConfig['xAccessor']>;
}

export type LayerArgs = XYLayerConfig & {
  columnToLabel?: string; // Actually a JSON key-value pair
  yScaleType: 'time' | 'linear' | 'log' | 'sqrt';
  xScaleType: 'time' | 'linear' | 'ordinal';
  isHistogram: boolean;
  // palette will always be set on the expression
  palette: PaletteOutput;
};

export type LayerConfigResult = LayerArgs & { type: 'lens_xy_layer' };

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
    layerType: { types: ['string'], options: Object.values(layerTypes), help: '' },
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
