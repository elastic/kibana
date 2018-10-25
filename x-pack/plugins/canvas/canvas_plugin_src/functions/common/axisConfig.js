/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment';

export const axisConfig = () => ({
  name: 'axisConfig',
  aliases: [],
  type: 'axisConfig',
  context: {
    types: ['datatable'],
  },
  help: i18n.translate('xpack.canvas.functions.axisConfigHelpText', {
    defaultMessage: 'Configure axis of a visualization',
  }),
  args: {
    show: {
      types: ['boolean'],
      help: i18n.translate('xpack.canvas.functions.axisConfig.args.showHelpText', {
        defaultMessage: 'Show the axis labels?',
      }),
      default: true,
    },
    position: {
      types: ['string'],
      help: i18n.translate('xpack.canvas.functions.axisConfig.args.positionHelpText', {
        defaultMessage: 'Position of the axis labels. Eg, top, bottom, left, and right',
      }),
      options: ['top', 'bottom', 'left', 'right'],
      default: '',
    },
    min: {
      types: ['number', 'date', 'string', 'null'],
      help: i18n.translate('xpack.canvas.functions.axisConfig.args.minHelpText', {
        defaultMessage:
          'Minimum value displayed in the axis. Must be a number or a date in ms or {isoFormat} string',
        values: {
          isoFormat: 'ISO8601',
        },
      }),
    },
    max: {
      types: ['number', 'date', 'string', 'null'],
      help: i18n.translate('xpack.canvas.functions.axisConfig.args.maxHelpText', {
        defaultMessage:
          'Maximum value displayed in the axis. Must be a number or a date in ms or {isoFormat} string',
        values: {
          isoFormat: 'ISO8601',
        },
      }),
    },
    tickSize: {
      types: ['number', 'null'],
      help: i18n.translate('xpack.canvas.functions.axisConfig.args.tickSizeHelpText', {
        defaultMessage: 'Increment size between each tick. Use for number axes only',
      }),
    },
  },
  fn: (context, args) => {
    const positions = ['top', 'bottom', 'left', 'right', ''];
    if (!positions.includes(args.position)) {
      throw new Error(
        i18n.translate('xpack.canvas.functions.axisConfig.invalidPositionErrorMessage', {
          defaultMessage: 'Invalid position {argsPosition}',
          values: {
            argsPosition: args.position,
          },
        })
      );
    }

    const min = typeof args.min === 'string' ? moment.utc(args.min).valueOf() : args.min;
    const max = typeof args.max === 'string' ? moment.utc(args.max).valueOf() : args.max;

    if (min != null && isNaN(min)) {
      throw new Error(
        i18n.translate('xpack.canvas.functions.axisConfig.minArgTypeErrorMessage', {
          defaultMessage:
            "Invalid date string '{argsMin}' found. '{minConfig}' must be a number, date in ms, or {isoFormat} date string",
          values: {
            argsMin: args.min,
            minConfig: 'min',
            isoFormat: 'ISO8601',
          },
        })
      );
    }
    if (max != null && isNaN(max)) {
      throw new Error(
        i18n.translate('xpack.canvas.functions.axisConfig.maxArgTypeErrorMessage', {
          defaultMessage:
            "Invalid date string '{argsMax}' found. '{max}' must be a number, date in ms, or {isoFormat} date string",
          values: {
            argsMax: args.max,
            maxConfig: 'max',
            isoFormat: 'ISO8601',
          },
        })
      );
    }

    return {
      type: 'axisConfig',
      ...args,
      min,
      max,
    };
  },
});
