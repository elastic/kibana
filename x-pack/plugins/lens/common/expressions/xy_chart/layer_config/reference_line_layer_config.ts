/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExpressionFunctionDefinition } from '../../../../../../../src/plugins/expressions/common';
import { layerTypes } from '../../../constants';
import { YConfig } from '../axis_config';

export interface XYReferenceLineLayerConfig {
  layerId: string;
  layerType: typeof layerTypes.REFERENCELINE;
  accessors: string[];
  yConfig?: YConfig[];
}
export type ReferenceLineLayerArgs = XYReferenceLineLayerConfig & {
  columnToLabel?: string;
};
export type ReferenceLineLayerConfigResult = ReferenceLineLayerArgs & {
  type: 'lens_xy_referenceLine_layer';
};

export const referenceLineLayerConfig: ExpressionFunctionDefinition<
  'lens_xy_referenceLine_layer',
  null,
  ReferenceLineLayerArgs,
  ReferenceLineLayerConfigResult
> = {
  name: 'lens_xy_referenceLine_layer',
  aliases: [],
  type: 'lens_xy_referenceLine_layer',
  help: `Configure a layer in the xy chart`,
  inputTypes: ['null'],
  args: {
    layerId: {
      types: ['string'],
      help: '',
    },
    layerType: { types: ['string'], options: [layerTypes.REFERENCELINE], help: '' },
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
  },
  fn: function fn(input: unknown, args: ReferenceLineLayerArgs) {
    return {
      type: 'lens_xy_referenceLine_layer',
      ...args,
    };
  },
};
