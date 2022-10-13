/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Ast, AstFunction, fromExpression, toExpression } from '@kbn/interpreter';
import { flowRight, get, groupBy } from 'lodash';
import {
  Filter as FilterType,
  FilterField,
  FilterViewInstance,
  FlattenFilterViewInstance,
} from '../../types/filters';

const SELECT_FILTER = 'selectFilter';
const FILTERS = 'filters';
const REMOVE_FILTER = 'removeFilter';

const includeFiltersExpressions = [FILTERS, SELECT_FILTER];
const excludeFiltersExpressions = [REMOVE_FILTER];
const filtersExpressions = [...includeFiltersExpressions, ...excludeFiltersExpressions];

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

export const createFilledFilterView = (filterView: FilterViewInstance<any>, filter: FilterType) =>
  flowRight(formatFilterView(filter), flattenFilterView(filter))(filterView);

export const groupFiltersBy = (filters: FilterType[], groupByField: FilterField) => {
  const groupedFilters = groupBy(filters, (filter) => filter[groupByField]);
  return Object.keys(groupedFilters).map((key) => ({
    name: groupedFilters[key]?.[0]?.[groupByField] ? key : null,
    filters: groupedFilters[key],
  }));
};

const excludeFiltersByGroups = (filters: Ast[], filterExprAst: AstFunction) => {
  const groupsToExclude = filterExprAst.arguments.group ?? [];
  const removeUngrouped = filterExprAst.arguments.ungrouped?.[0] ?? false;
  return filters.filter((filter) => {
    const groups: string[] = get(filter, 'chain[0].arguments.filterGroup', []).filter(
      (group: string) => group !== ''
    );
    const noNeedToExcludeByGroup = !(
      groups.length &&
      groupsToExclude.length &&
      groupsToExclude.includes(groups[0])
    );

    const noNeedToExcludeByUngrouped = (removeUngrouped && groups.length) || !removeUngrouped;
    const excludeAllFilters = !groupsToExclude.length && !removeUngrouped;

    return !excludeAllFilters && noNeedToExcludeByUngrouped && noNeedToExcludeByGroup;
  });
};

const includeFiltersByGroups = (
  filters: Ast[],
  filterExprAst: AstFunction,
  ignoreUngroupedIfGroups: boolean = false
) => {
  const groupsToInclude = filterExprAst.arguments.group ?? [];
  const includeOnlyUngrouped = filterExprAst.arguments.ungrouped?.[0] ?? false;
  return filters.filter((filter) => {
    const groups: string[] = get(filter, 'chain[0].arguments.filterGroup', []).filter(
      (group: string) => group !== ''
    );
    const needToIncludeByGroup =
      groups.length && groupsToInclude.length && groupsToInclude.includes(groups[0]);

    const needToIncludeByUngrouped =
      includeOnlyUngrouped &&
      !groups.length &&
      (ignoreUngroupedIfGroups ? !groupsToInclude.length : true);

    const allowAll = !groupsToInclude.length && !includeOnlyUngrouped;
    return needToIncludeByUngrouped || needToIncludeByGroup || allowAll;
  });
};

export const getFiltersByFilterExpressions = (
  filters: string[],
  filterExprsAsts: AstFunction[]
) => {
  const filtersAst = filters.map((filter) => fromExpression(filter));
  const matchedFiltersAst = filterExprsAsts.reduce((includedFilters, filter) => {
    if (excludeFiltersExpressions.includes(filter.function)) {
      return excludeFiltersByGroups(includedFilters, filter);
    }
    const isFiltersExpr = filter.function === FILTERS;
    const filtersToInclude = isFiltersExpr ? filtersAst : includedFilters;
    return includeFiltersByGroups(filtersToInclude, filter, isFiltersExpr);
  }, filtersAst);

  return matchedFiltersAst.map((ast) => toExpression(ast));
};

export const getFiltersExprsFromExpression = (expr: string) => {
  const ast = fromExpression(expr);
  return ast.chain.filter((expression) => filtersExpressions.includes(expression.function));
};

export const isExpressionWithFilters = (expr: string) => {
  const ast = fromExpression(expr);
  return ast.chain.some((expression) => filtersExpressions.includes(expression.function));
};
