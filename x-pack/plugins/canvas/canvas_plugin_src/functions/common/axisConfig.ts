/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { ContextFunction, Datatable } from '../types';

interface Arguments {
  show: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
  min: number | string | null;
  max: number | string | null;
  tickSize: number | null;
}

interface AxisConfig extends Arguments {
  type: 'axisConfig';
}

const VALID_POSITIONS = ['top', 'bottom', 'left', 'right', ''];

export function axisConfig(): ContextFunction<'axisConfig', Datatable, Arguments, AxisConfig> {
  return {
    name: 'axisConfig',
    aliases: [],
    type: 'axisConfig',
    context: {
      types: ['datatable'],
    },
    help: 'Configure axis of a visualization',
    args: {
      show: {
        types: ['boolean'],
        help: 'Show the axis labels?',
        default: true,
      },
      position: {
        types: ['string'],
        help: 'Position of the axis labels - top, bottom, left, and right',
        options: ['top', 'bottom', 'left', 'right'],
        default: 'left',
      },
      min: {
        types: ['number', 'date', 'string', 'null'],
        help:
          'Minimum value displayed in the axis. Must be a number or a date in ms or ISO8601 string',
      },
      max: {
        types: ['number', 'date', 'string', 'null'],
        help:
          'Maximum value displayed in the axis. Must be a number or a date in ms or ISO8601 string',
      },
      tickSize: {
        types: ['number', 'null'],
        help: 'Increment size between each tick. Use for number axes only',
      },
    },
    fn: (_context, args) => {
      const { position, min, max, ...rest } = args;

      if (!VALID_POSITIONS.includes(position)) {
        throw new Error(`Invalid position: '${args.position}'`);
      }

      const minVal = typeof min === 'string' ? moment.utc(min).valueOf() : min;
      const maxVal = typeof max === 'string' ? moment.utc(max).valueOf() : max;

      // This != check is not !== in order to handle NaN cases properly.
      if (minVal != null && isNaN(minVal)) {
        throw new Error(
          `Invalid date string: '${
            args.min
          }'. 'min' must be a number, date in ms, or ISO8601 date string`
        );
      }

      // This != check is not !== in order to handle NaN cases properly.
      if (maxVal != null && isNaN(maxVal)) {
        throw new Error(
          `Invalid date string: '${
            args.max
          }'. 'max' must be a number, date in ms, or ISO8601 date string`
        );
      }

      return {
        max: maxVal,
        min: minVal,
        type: 'axisConfig',
        position,
        ...rest,
      };
    },
  };
}
