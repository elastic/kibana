/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sortBy } from 'lodash';
import { ExpressionFunctionDefinition } from 'src/plugins/expressions';
// @ts-expect-error unconverted lib file
import { queryDatatable } from '../../../../common/lib/datatable/query';
import { DemoRows } from './demo_rows_types';
import { getDemoRows } from './get_demo_rows';
import { ExpressionValueFilter, Datatable, DatatableColumn, DatatableRow } from '../../../../types';
import { getFunctionHelp } from '../../../../i18n';

interface Arguments {
  type: string;
}

export function demodata(): ExpressionFunctionDefinition<
  'demodata',
  ExpressionValueFilter,
  Arguments,
  Datatable
> {
  const { help, args: argHelp } = getFunctionHelp().demodata;

  return {
    name: 'demodata',
    aliases: [],
    type: 'datatable',
    context: {
      types: ['filter'],
    },
    help,
    args: {
      type: {
        types: ['string'],
        aliases: ['_'],
        help: argHelp.type,
        default: 'ci',
        options: ['ci', 'shirts'],
      },
    },
    fn: (input, args) => {
      const demoRows = getDemoRows(args.type);

      let set = {} as { columns: DatatableColumn[]; rows: DatatableRow[] };

      if (args.type === DemoRows.CI) {
        set = {
          columns: [
            { name: '@timestamp', type: 'date' },
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
      } else if (args.type === DemoRows.SHIRTS) {
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
        input
      );
    },
  };
}
