/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/public';
import { ExpressionValueFilter } from '../../types';
import { getFunctionHelp } from '../../i18n';

export interface Arguments {
  group: string[];
  ungrouped: boolean;
}

export type FiltersFunction = ExpressionFunctionDefinition<
  'filters',
  null,
  Arguments,
  ExpressionValueFilter
>;

export function buildFiltersFunction(
  fn: FiltersFunction['fn'],
  migrations?: FiltersFunction['migrations']
) {
  return function filters(): FiltersFunction {
    const { help, args: argHelp } = getFunctionHelp().filters;

    return {
      name: 'filters',
      type: 'filter',
      help,
      context: {
        types: ['null'],
      },
      args: {
        group: {
          aliases: ['_'],
          types: ['string'],
          help: argHelp.group,
          multi: true,
        },
        ungrouped: {
          aliases: ['nogroup', 'nogroups'],
          types: ['boolean'],
          help: argHelp.ungrouped,
          default: false,
        },
      },
      fn,
      migrations,
    };
  };
}
