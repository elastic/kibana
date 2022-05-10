/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy } from 'lodash';
import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin';
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
            { id: '@timestamp', name: '@timestamp', meta: { type: 'date' } },
            { id: 'time', name: 'time', meta: { type: 'date' } },
            { id: 'cost', name: 'cost', meta: { type: 'number' } },
            { id: 'username', name: 'username', meta: { type: 'string' } },
            { id: 'price', name: 'price', meta: { type: 'number' } },
            { id: 'age', name: 'age', meta: { type: 'number' } },
            { id: 'country', name: 'country', meta: { type: 'string' } },
            { id: 'state', name: 'state', meta: { type: 'string' } },
            { id: 'project', name: 'project', meta: { type: 'string' } },
            { id: 'percent_uptime', name: 'percent_uptime', meta: { type: 'number' } },
          ],
          rows: sortBy(demoRows, 'time'),
        };
      } else if (args.type === DemoRows.SHIRTS) {
        set = {
          columns: [
            { id: 'size', name: 'size', meta: { type: 'string' } },
            { id: 'color', name: 'color', meta: { type: 'string' } },
            { id: 'price', name: 'price', meta: { type: 'number' } },
            { id: 'cut', name: 'cut', meta: { type: 'string' } },
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
