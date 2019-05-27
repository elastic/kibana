/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';
import { ContextFunction, Datatable, Render } from '../types';
import { getFunctionHelp } from '../../strings';

interface Arguments {
  filterColumn: string;
  valueColumn: string;
  filterGroup: string | null;
}

interface Return {
  column: string;
  choices: any;
}

export function dropdownControl(): ContextFunction<
  'dropdownControl',
  Datatable,
  Arguments,
  Render<Return>
> {
  const { help, args: argHelp } = getFunctionHelp().dropdownControl;

  return {
    name: 'dropdownControl',
    aliases: [],
    type: 'render',
    context: {
      types: ['datatable'],
    },
    help,
    args: {
      filterColumn: {
        types: ['string'],
        help: argHelp.filterColumn,
      },
      valueColumn: {
        types: ['string'],
        help: argHelp.valueColumn,
      },
      filterGroup: {
        types: ['string', 'null'],
        help: argHelp.filterGroup,
      },
    },
    fn: (context, { valueColumn, filterColumn, filterGroup }) => {
      let choices = [];

      if (context.rows[0][valueColumn]) {
        choices = uniq(context.rows.map(row => row[valueColumn])).sort();
      }

      const column = filterColumn || valueColumn;

      return {
        type: 'render',
        as: 'dropdown_filter',
        value: {
          column,
          choices,
          filterGroup,
        },
      };
    },
  };
}
