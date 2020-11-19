/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromExpression } from '@kbn/interpreter/common';
import { get } from 'lodash';
import { ExpressionFunctionDefinition } from 'src/plugins/expressions/public';
import { interpretAst } from '../lib/run_interpreter';
// @ts-expect-error untyped local
import { getState } from '../state/store';
import { getGlobalFilters, getWorkpadVariablesAsObject } from '../state/selectors/workpad';
import { ExpressionValueFilter } from '../../types';
import { getFunctionHelp } from '../../i18n';
import { InitializeArguments } from '.';

interface Arguments {
  group: string[];
  ungrouped: boolean;
}

function getFiltersByGroup(allFilters: string[], groups?: string[], ungrouped = false): string[] {
  if (!groups || groups.length === 0) {
    if (!ungrouped) {
      return allFilters;
    }

    // remove all allFilters that belong to a group
    return allFilters.filter((filter: string) => {
      const ast = fromExpression(filter);
      const expGroups = get(ast, 'chain[0].arguments.filterGroup', []);
      return expGroups.length === 0;
    });
  }

  return allFilters.filter((filter: string) => {
    const ast = fromExpression(filter);
    const expGroups: string[] = get(ast, 'chain[0].arguments.filterGroup', []);
    return expGroups.length > 0 && expGroups.every((expGroup) => groups.includes(expGroup));
  });
}

type FiltersFunction = ExpressionFunctionDefinition<
  'filters',
  null,
  Arguments,
  ExpressionValueFilter
>;

export function filtersFunctionFactory(initialize: InitializeArguments): () => FiltersFunction {
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
      fn: (input, { group, ungrouped }) => {
        const filterList = getFiltersByGroup(getGlobalFilters(getState()), group, ungrouped);

        if (filterList && filterList.length) {
          const filterExpression = filterList.join(' | ');
          const filterAST = fromExpression(filterExpression);
          return interpretAst(filterAST, getWorkpadVariablesAsObject(getState()));
        } else {
          const filterType = initialize.types.filter;
          return filterType?.from(null, {});
        }
      },
    };
  };
}
