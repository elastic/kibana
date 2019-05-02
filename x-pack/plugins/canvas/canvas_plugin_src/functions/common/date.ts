/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { NullContextFunction } from '../types';

interface Arguments {
  value: string | null;
  format: string;
}

export function date(): NullContextFunction<'date', Arguments, number> {
  return {
    name: 'date',
    type: 'number',
    context: {
      types: ['null'],
    },
    help: 'Returns the current time, or a time parsed from a string, as milliseconds since epoch',
    args: {
      value: {
        aliases: ['_'],
        types: ['string', 'null'],
        help:
          'An optional date string to parse into milliseconds since epoch ' +
          'Can be either a valid Javascript Date input or a string to parse using the format argument. Must be an ISO 8601 string or you must provide the format',
      },
      format: {
        types: ['string'],
        help:
          'The momentJS format for parsing the optional date string (See https://momentjs.com/docs/#/displaying/)',
      },
    },
    fn: (_context, args) => {
      const { value: argDate, format } = args;

      const outputDate =
        argDate && format
          ? moment.utc(argDate, format).toDate()
          : argDate
          ? new Date(argDate)
          : new Date();

      if (isNaN(outputDate.getTime())) {
        throw new Error(`Invalid date input: ${argDate}`);
      }

      return outputDate.valueOf();
    },
  };
}
