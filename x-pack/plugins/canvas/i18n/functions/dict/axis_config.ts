/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { axisConfig } from '../../../canvas_plugin_src/functions/common/axisConfig';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { Position } from '../../../types';
import { ISO8601 } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof axisConfig>> = {
  help: i18n.translate('xpack.canvas.functions.axisConfigHelpText', {
    defaultMessage: 'Configures the axis of a visualization. Only used with {plotFn}.',
    values: {
      plotFn: '`plot`',
    },
  }),
  args: {
    max: i18n.translate('xpack.canvas.functions.axisConfig.args.maxHelpText', {
      defaultMessage:
        'The maximum value displayed in the axis. Must be a number or a date in milliseconds since epoch or {ISO8601} string.',
      values: {
        ISO8601,
      },
    }),
    min: i18n.translate('xpack.canvas.functions.axisConfig.args.minHelpText', {
      defaultMessage:
        'The minimum value displayed in the axis. Must be a number or a date in milliseconds since epoch or {ISO8601} string.',
      values: {
        ISO8601,
      },
    }),
    position: i18n.translate('xpack.canvas.functions.axisConfig.args.positionHelpText', {
      defaultMessage: 'The position of the axis labels. For example, {list}, or {end}.',
      values: {
        list: Object.values(Position)
          .slice(0, -1)
          .map((position) => `\`"${position}"\``)
          .join(', '),
        end: Object.values(Position).slice(-1)[0],
      },
    }),
    show: i18n.translate('xpack.canvas.functions.axisConfig.args.showHelpText', {
      defaultMessage: 'Show the axis labels?',
    }),
    tickSize: i18n.translate('xpack.canvas.functions.axisConfig.args.tickSizeHelpText', {
      defaultMessage: 'The increment size between each tick. Use for `number` axes only',
    }),
  },
};

export const errors = {
  invalidPosition: (position: string) =>
    new Error(
      i18n.translate('xpack.canvas.functions.axisConfig.invalidPositionErrorMessage', {
        defaultMessage: "Invalid position: '{position}'",
        values: {
          position,
        },
      })
    ),
  invalidMinDateString: (min: string) =>
    new Error(
      i18n.translate('xpack.canvas.functions.axisConfig.invalidMinDateStringErrorMessage', {
        defaultMessage:
          "Invalid date string: '{min}'. 'min' must be a number, date in ms, or ISO8601 date string",
        values: {
          min,
        },
      })
    ),
  invalidMaxDateString: (max: string) =>
    new Error(
      i18n.translate('xpack.canvas.functions.axisConfig.invalidMaxPositionErrorMessage', {
        defaultMessage:
          "Invalid date string: '{max}'. 'max' must be a number, date in ms, or ISO8601 date string",
        values: {
          max,
        },
      })
    ),
};
