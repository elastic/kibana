/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
export const axisConfig = () => ({
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
      default: '',
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
  fn: (context, args) => {
    const positions = ['top', 'bottom', 'left', 'right', ''];
    if (!positions.includes(args.position)) throw new Error(`Invalid position ${args.position}`);

    const min = typeof args.min === 'string' ? moment.utc(args.min).valueOf() : args.min;
    const max = typeof args.max === 'string' ? moment.utc(args.max).valueOf() : args.max;

    if (min != null && isNaN(min)) {
      throw new Error(
        `Invalid date string '${
          args.min
        }' found. 'min' must be a number, date in ms, or ISO8601 date string`
      );
    }
    if (max != null && isNaN(max)) {
      throw new Error(
        `Invalid date string '${
          args.max
        }' found. 'max' must be a number, date in ms, or ISO8601 date string`
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
