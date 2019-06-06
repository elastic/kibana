/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
import { getFunctionHelp, getFunctionErrors } from '../../strings';

interface Arguments {
  value: string | null;
  format: string;
}

export function date(): ExpressionFunction<'date', null, Arguments, number> {
  const { help, args: argHelp } = getFunctionHelp().date;
  const errors = getFunctionErrors().date;

  return {
    name: 'date',
    type: 'number',
    context: {
      types: ['null'],
    },
    help,
    args: {
      value: {
        aliases: ['_'],
        types: ['string', 'null'],
        help: argHelp.value,
      },
      format: {
        types: ['string'],
        help: argHelp.format,
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
        throw errors.invalidDateInput(argDate);
      }

      return outputDate.valueOf();
    },
  };
}
