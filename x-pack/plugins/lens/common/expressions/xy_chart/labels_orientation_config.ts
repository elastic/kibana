/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionDefinition } from '../../../../../../src/plugins/expressions/common';

export interface LabelsOrientationConfig {
  x: number;
  yLeft: number;
  yRight: number;
}

export type LabelsOrientationConfigResult = LabelsOrientationConfig & {
  type: 'lens_xy_labelsOrientationConfig';
};

export const labelsOrientationConfig: ExpressionFunctionDefinition<
  'lens_xy_labelsOrientationConfig',
  null,
  LabelsOrientationConfig,
  LabelsOrientationConfigResult
> = {
  name: 'lens_xy_labelsOrientationConfig',
  aliases: [],
  type: 'lens_xy_labelsOrientationConfig',
  help: `Configure the xy chart's tick labels orientation`,
  inputTypes: ['null'],
  args: {
    x: {
      types: ['number'],
      options: [0, -90, -45],
      help: i18n.translate('xpack.lens.xyChart.xAxisLabelsOrientation.help', {
        defaultMessage: 'Specifies the labels orientation of the x-axis.',
      }),
    },
    yLeft: {
      types: ['number'],
      options: [0, -90, -45],
      help: i18n.translate('xpack.lens.xyChart.yLeftAxisLabelsOrientation.help', {
        defaultMessage: 'Specifies the labels orientation of the left y-axis.',
      }),
    },
    yRight: {
      types: ['number'],
      options: [0, -90, -45],
      help: i18n.translate('xpack.lens.xyChart.yRightAxisLabelsOrientation.help', {
        defaultMessage: 'Specifies the labels orientation of the right y-axis.',
      }),
    },
  },
  fn: function fn(input: unknown, args: LabelsOrientationConfig) {
    return {
      type: 'lens_xy_labelsOrientationConfig',
      ...args,
    };
  },
};
