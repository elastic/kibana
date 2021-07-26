/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionDefinition } from '../../../../../../src/plugins/expressions/common';
import type { AxesSettingsConfig } from './axis_config';

export type GridlinesConfigResult = AxesSettingsConfig & { type: 'lens_xy_gridlinesConfig' };

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
