/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';
import { ContextFunction, Datatable, Render } from '../types';

interface Arguments {
  filterColumn: string;
  valueColumn: string;
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
  return {
    name: 'dropdownControl',
    aliases: [],
    type: 'render',
    context: {
      types: ['datatable'],
    },
    help: 'Configure a drop down filter control element',
    args: {
      filterColumn: {
        types: ['string'],
        help: 'The column or field to attach the filter to',
      },
      valueColumn: {
        types: ['string'],
        help: 'The datatable column from which to extract the unique values for the drop down',
      },
    },
    fn: (context, { valueColumn, filterColumn }) => {
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
        },
      };
    },
  };
}
