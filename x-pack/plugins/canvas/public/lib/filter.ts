/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Ast, fromExpression, toExpression } from '@kbn/interpreter/common';
import { flowRight, get, groupBy } from 'lodash';
import immutable from 'object-path-immutable';
import {
  CanvasFilterExpression,
  Filter as FilterType,
  FilterField,
  FilterType as FilterTypes,
  FilterViewInstance,
  FlattenFilterViewInstance,
} from '../../types/filters';
import { filterViewsRegistry } from '../filter_view_types';

const { merge } = immutable;

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

export const getFiltersByGroups = (filters: CanvasFilterExpression[], groups: string[]) =>
  filters.filter(({ filter }) => {
    const ast = fromExpression(filter);
    const expGroups: string[] = get(ast, 'chain[0].arguments.filterGroup', []);
    return expGroups.length > 0 && expGroups.every((expGroup) => groups.includes(expGroup));
  });

export const extractGroupsFromElementsFilters = (expr: string) => {
  const ast = fromExpression(expr);
  const filtersFn = ast.chain.filter((expression) => expression.function === 'filters')[0];
  return filtersFn?.arguments.group?.map((g) => g.toString()) ?? [];
};

const exactlyRemapSchema = {
  column: 'filterColumn',
  filterGroup: 'filterGroup',
};

const timeRemapSchema = {
  column: 'column',
  filterGroup: 'filterGroup',
};

const remappingSchemas: Record<string, Record<string, string>> = {
  dropdownControl: exactlyRemapSchema,
  exactly: exactlyRemapSchema,
  timefilterControl: timeRemapSchema,
};

const remapArguments = (argsToRemap: Record<string, any>, type: string) => {
  const remappingRules = remappingSchemas[type] ?? remappingSchemas.exactly;
  return Object.keys(remappingRules).reduce((remappedArgs, argName) => {
    const argsKey = remappingRules[argName];
    return {
      ...remappedArgs,
      [argName]: argsToRemap[argsKey],
    };
  }, {});
};

export const syncFilterWithExpr = (expression: string, filter: string) => {
  const filterExpressions = ['dropdownControl', 'timefilterControl', 'exactly'];
  const filterAst = fromExpression(filter);
  const expressionAst = fromExpression(expression);

  const filterExpressionAst = expressionAst.chain.find(({ function: fn }) =>
    filterExpressions.includes(fn)
  );
  if (!filterExpressionAst) return;

  const remappedArgs = remapArguments(filterExpressionAst.arguments, filterExpressionAst.function);
  const updatedFilterAst = merge<Ast>(filterAst, `chain.0.arguments`, remappedArgs);
  return toExpression(updatedFilterAst);
};
