/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { ContextFunction, Datatable, Position } from '../types';
import { getFunctionHelp } from '../../strings';

interface Arguments {
  show: boolean;
  position: Position;
  min: number | string | null;
  max: number | string | null;
  tickSize: number | null;
}

interface AxisConfig extends Arguments {
  type: 'axisConfig';
}

export function axisConfig(): ContextFunction<'axisConfig', Datatable, Arguments, AxisConfig> {
  const { help, args: argHelp } = getFunctionHelp().axisConfig;

  return {
    name: 'axisConfig',
    aliases: [],
    type: 'axisConfig',
    context: {
      types: ['datatable'],
    },
    help,
    args: {
      show: {
        types: ['boolean'],
        help: argHelp.show,
        default: true,
      },
      position: {
        types: ['string'],
        help: argHelp.position,
        options: Object.values(Position),
        default: 'left',
      },
      min: {
        types: ['number', 'date', 'string', 'null'],
        help: argHelp.min,
      },
      max: {
        types: ['number', 'date', 'string', 'null'],
        help: argHelp.max,
      },
      tickSize: {
        types: ['number', 'null'],
        help: argHelp.tickSize,
      },
    },
    fn: (_context, args) => {
      const { position, min, max, ...rest } = args;

      if (!Object.values(Position).includes(position)) {
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
