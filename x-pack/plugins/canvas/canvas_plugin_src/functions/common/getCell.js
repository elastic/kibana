/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const getCell = () => ({
  name: 'getCell',
  help: i18n.translate('xpack.canvas.functions.getCellHelpText', {
    defaultMessage: 'Fetch a single cell in a table',
  }),
  context: {
    types: ['datatable'],
  },
  args: {
    column: {
      types: ['string'],
      aliases: ['_', 'c'],
      help: i18n.translate('xpack.canvas.functions.getCell.args.columnHelpText', {
        defaultMessage: 'The name of the column value to fetch',
      }),
    },
    row: {
      types: ['number'],
      aliases: ['r'],
      help: i18n.translate('xpack.canvas.functions.getCell.args.rowHelpText', {
        defaultMessage: 'The row number, starting at 0',
      }),
      default: 0,
    },
  },
  fn: (context, args) => {
    const row = context.rows[args.row];
    if (!row) {
      throw new Error(
        i18n.translate('xpack.canvas.functions.getCell.rowNotFoundErrorMessage', {
          defaultMessage: 'Row not found: {row}',
          values: { row: args.row },
        })
      );
    }

    const { column = context.columns[0].name } = args;
    const value = row[column];

    if (typeof value === 'undefined') {
      throw new Error(
        i18n.translate('xpack.canvas.functions.getCell.columnNotFoundErrorMessage', {
          defaultMessage: 'Column not found: {column}',
          values: { column },
        })
      );
    }

    return value;
  },
});
