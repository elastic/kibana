/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
import { Position } from '../types';
import { getFunctionHelp, getFunctionErrors } from '../../strings';

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

export function axisConfig(): ExpressionFunction<'axisConfig', null, Arguments, AxisConfig> {
  const { help, args: argHelp } = getFunctionHelp().axisConfig;
  const errors = getFunctionErrors().axisConfig;

  return {
    name: 'axisConfig',
    aliases: [],
    type: 'axisConfig',
    context: {
      types: ['null'],
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
        types: ['number', 'string', 'null'],
        help: argHelp.min,
      },
      max: {
        types: ['number', 'string', 'null'],
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
        throw errors.invalidPosition(position);
      }

      const minVal = typeof min === 'string' ? moment.utc(min).valueOf() : min;
      const maxVal = typeof max === 'string' ? moment.utc(max).valueOf() : max;

      // This != check is not !== in order to handle NaN cases properly.
      if (minVal != null && isNaN(minVal)) {
        // using `as` because of typing constraint: we know it's a string at this point.
        throw errors.invalidMinDateString(min as string);
      }

      // This != check is not !== in order to handle NaN cases properly.
      if (maxVal != null && isNaN(maxVal)) {
        // using `as` because of typing constraint: we know it's a string at this point.
        throw errors.invalidMaxDateString(max as string);
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
