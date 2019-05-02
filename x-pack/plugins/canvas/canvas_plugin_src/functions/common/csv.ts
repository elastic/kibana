/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Papa from 'papaparse';
import { Datatable, NullContextFunction } from '../types';

interface Arguments {
  data: string;
  delimiter: string;
  newline: string;
}

export function csv(): NullContextFunction<'csv', Arguments, Datatable> {
  return {
    name: 'csv',
    type: 'datatable',
    context: {
      types: ['null'],
    },
    args: {
      data: {
        aliases: ['_'],
        types: ['string'],
        help: 'CSV data to use',
      },
      delimiter: {
        types: ['string'],
        help: 'Data separation character',
      },
      newline: {
        types: ['string'],
        help: 'Row separation character',
      },
    },
    help: 'Create datatable from csv input',
    fn(_context, args) {
      const { data: csvString, delimiter, newline } = args;

      const config: Papa.ParseConfig = {
        transform: (val: string) => {
          if (val.indexOf('"') >= 0) {
            return val.trim().replace(/(^\"|\"$)/g, '');
          }
          return val;
        },
      };

      if (delimiter != null) {
        config.delimiter = delimiter;
      }
      if (newline != null) {
        config.newline = newline;
      }

      const output = Papa.parse(csvString, config);
      const { data, errors } = output;

      if (errors.length > 0) {
        throw new Error('Error parsing input CSV.');
      }

      // output.data is an array of arrays, rows and values in each row
      return data.reduce(
        (acc, row, i) => {
          if (i === 0) {
            // first row, assume header values
            row.forEach((colName: string) =>
              acc.columns.push({ name: colName.trim(), type: 'string' })
            );
          } else {
            // any other row is a data row
            const rowObj = row.reduce((rowAcc: string[], colValue: string, j: number) => {
              const colName = acc.columns[j].name;
              rowAcc[colName] = colValue;
              return rowAcc;
            }, {});

            acc.rows.push(rowObj);
          }

          return acc;
        },
        {
          type: 'datatable',
          columns: [],
          rows: [],
        }
      );
    },
  };
}
