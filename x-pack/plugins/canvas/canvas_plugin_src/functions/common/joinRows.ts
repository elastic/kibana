/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ExpressionFunction } from '../../../../../../src/legacy/core_plugins/interpreter/types';
import { Datatable } from '../types';
import { getFunctionErrors } from '../../strings/functions';

interface Arguments {
  column: string;
  separator: string;
  quote: string;
}

const escapeString = (data: string, quotechar: string): string => {
  if (quotechar === undefined || quotechar === '') {
    return data;
  } else {
    const regex = new RegExp(quotechar, 'g');
    return data.replace(/\\/g, `\\\\`).replace(regex, `\\${quotechar}`);
  }
};

export function joinRows(): ExpressionFunction<'joinRows', Datatable, Arguments, string> {
  const errors = getFunctionErrors().getCell;
  return {
    name: 'joinRows',
    type: 'string',
    help: 'Join values from rows in a datatable into a string',
    context: {
      types: ['datatable'],
    },
    args: {
      column: {
        aliases: ['_'],
        types: ['string'],
        required: true,
        help: 'Column to join values from',
      },
      separator: {
        aliases: ['sep'],
        types: ['string'],
        default: ',',
        help: 'Separator to use between row values',
      },
      quote: {
        types: ['string'],
        default: 'DEFAULT',
        help: 'Quote character around values',
      },
    },
    fn: (context, { column, separator, quote }) => {
      // work around having single quote as the default value not working.
      const quotechar = quote === 'DEFAULT' ? "'" : quote;
      return context.rows
        .reduce((acc, row) => {
          const value = row[column];
          if (typeof value === 'undefined') {
            throw errors.columnNotFound(column);
          }
          if (acc.includes(value)) return acc;
          return acc.concat(value);
        }, [])
        .map((x: any) => `${quotechar}${escapeString(x, quotechar)}${quotechar}`)
        .join(separator);
    },
  };
}
