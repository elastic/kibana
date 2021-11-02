/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromExpression } from '@kbn/interpreter/common';
import { flowRight, get, groupBy } from 'lodash';
import {
  Filter as FilterType,
  FilterField,
  FilterViewInstance,
  FlattenFilterViewInstance,
} from '../../types/filters';
import { filterViewsRegistry } from '../filter_view_types';

export const defaultFormatter = (value: unknown) => (value || null ? `${value}` : '-');

export const formatFilterView =
  (filterValue: FilterType) => (filterView: FlattenFilterViewInstance) => {
    const filterViewKeys = Object.keys(filterView) as Array<keyof FilterViewInstance>;
    return filterViewKeys.reduce(
      (acc, key) => ({
        ...acc,
        [key]: {
          label: filterView[key].label,
          formattedValue: (filterView[key].formatter ?? defaultFormatter)(filterValue[key]),
          component: filterView[key].component,
        },
      }),
      {}
    );
  };

export const flattenFilterView = (filterValue: FilterType) => (filterView: FilterViewInstance) => {
  const filterViewKeys = Object.keys(filterView) as Array<keyof FilterViewInstance>;
  return filterViewKeys.reduce<FlattenFilterViewInstance>((acc, key) => {
    const filterField = filterView[key];
    if (typeof filterField === 'function') {
      const val = filterField(filterValue[key]);
      return { ...acc, ...val };
    }
    return { ...acc, [key]: filterField };
  }, {});
};

export const transformFilterView = (filterView: FilterViewInstance, filterValue: FilterType) =>
  flowRight(formatFilterView(filterValue), flattenFilterView(filterValue))(filterView);

export const formatFilter = (filter: FilterType) => {
  const filterView = filterViewsRegistry.get(filter.type) ?? filterViewsRegistry.get('default');
  if (!filterView) {
    throw new Error('At least default filter view should be defined');
  }

  return transformFilterView(filterView.view(), filter);
};

export const groupFiltersBy = (filters: FilterType[], groupByField: FilterField) => {
  const groupedFilters = groupBy(filters, (filter) => filter[groupByField]);
  return Object.keys(groupedFilters).map((key) => ({
    name: groupedFilters[key]?.[0]?.[groupByField] ? key : null,
    filters: groupedFilters[key],
  }));
};

export const getFiltersByGroup = (allFilters: string[], groups: string[]) =>
  allFilters.filter((filter: string) => {
    const ast = fromExpression(filter);
    const expGroups: string[] = get(ast, 'chain[0].arguments.filterGroup', []);
    return expGroups.length > 0 && expGroups.every((expGroup) => groups.includes(expGroup));
  });

export const extractGroupsFromElementsFilters = (expr: string) => {
  const ast = fromExpression(expr);
  const filtersFn = ast.chain.filter((expression) => expression.function === 'filters')[0];
  const groups = filtersFn?.arguments.group?.map((g) => g.toString()) ?? undefined;
  return groups;
};
