/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromExpression } from '@kbn/interpreter';
import { get } from 'lodash';
import { pluginServices } from '../services';
import type { FiltersFunction } from '../../common/functions';
import { buildFiltersFunction } from '../../common/functions';
import { InitializeArguments } from '.';

export interface Arguments {
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
      const expGroups: string[] = get(ast, 'chain[0].arguments.filterGroup', []);
      return expGroups.length === 0;
    });
  }

  return allFilters.filter((filter: string) => {
    const ast = fromExpression(filter);
    const expGroups: string[] = get(ast, 'chain[0].arguments.filterGroup', []);
    return expGroups.length > 0 && expGroups.every((expGroup) => groups.includes(expGroup));
  });
}

export function filtersFunctionFactory(initialize: InitializeArguments): () => FiltersFunction {
  const fn: FiltersFunction['fn'] = (input, { group, ungrouped }) => {
    const { expressions, filters: filtersService } = pluginServices.getServices();

    const filterList = getFiltersByGroup(filtersService.getFilters(), group, ungrouped);

    if (filterList && filterList.length) {
      const filterExpression = filterList.join(' | ');
      const filterAST = fromExpression(filterExpression);
      const { variables } = filtersService.getFiltersContext();
      return expressions.interpretAst(filterAST, variables);
    } else {
      const filterType = initialize.types.filter;
      return filterType?.from(null, {});
    }
  };

  return buildFiltersFunction(fn);
}
