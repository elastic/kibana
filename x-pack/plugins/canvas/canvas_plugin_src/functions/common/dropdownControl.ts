/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import { Datatable, Render, ExpressionFunctionDefinition } from '../../../types';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  filterColumn: string;
  valueColumn: string;
  filterGroup: string;
}

interface Return {
  column: string;
  choices: any;
}

export function dropdownControl(): ExpressionFunctionDefinition<
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
    inputTypes: ['datatable'],
    help,
    args: {
      filterColumn: {
        types: ['string'],
        required: true,
        help: argHelp.filterColumn,
      },
      valueColumn: {
        types: ['string'],
        required: true,
        help: argHelp.valueColumn,
      },
      filterGroup: {
        types: ['string'],
        help: argHelp.filterGroup,
      },
    },
    fn: (input, { valueColumn, filterColumn, filterGroup }) => {
      let choices = [];

      const filteredRows = input.rows.filter(
        (row) => row[valueColumn] !== null && row[valueColumn] !== undefined
      );

      if (filteredRows.length > 0) {
        choices = uniq(filteredRows.map((row) => row[valueColumn])).sort();
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
