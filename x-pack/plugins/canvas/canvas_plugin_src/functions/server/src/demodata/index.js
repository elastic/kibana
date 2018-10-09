/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { sortBy } from 'lodash';
import { queryDatatable } from '../../../../../common/lib/datatable/query';
import { getDemoRows } from './get_demo_rows';

export const demodata = () => ({
  name: 'demodata',
  aliases: [],
  type: 'datatable',
  help: i18n.translate('xpack.canvas.functions.demodataHelpText', {
    defaultMessage:
      'A mock data set that includes project CI times with usernames, countries and run phases.',
  }),

  context: {
    types: ['filter'],
  },
  args: {
    type: {
      types: ['string', 'null'],
      aliases: ['_'],
      help: i18n.translate('xpack.canvas.functions.demodata.argsTypeHelpText', {
        defaultMessage: 'The name of the demo data set to use',
      }),
      default: 'ci',
    },
  },
  fn: (context, args) => {
    const demoRows = getDemoRows(args.type);

    let set = {};
    if (args.type === 'ci') {
      set = {
        columns: [
          { name: 'time', type: 'date' },
          { name: 'cost', type: 'number' },
          { name: 'username', type: 'string' },
          { name: 'price', type: 'number' },
          { name: 'age', type: 'number' },
          { name: 'country', type: 'string' },
          { name: 'state', type: 'string' },
          { name: 'project', type: 'string' },
          { name: 'percent_uptime', type: 'number' },
        ],
        rows: sortBy(demoRows, 'time'),
      };
    } else if (args.type === 'shirts') {
      set = {
        columns: [
          { name: 'size', type: 'string' },
          { name: 'color', type: 'string' },
          { name: 'price', type: 'number' },
          { name: 'cut', type: 'string' },
        ],
        rows: demoRows,
      };
    }

    const { columns, rows } = set;
    return queryDatatable(
      {
        type: 'datatable',
        columns,
        rows,
      },
      context
    );
  },
});
