/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flowRight, groupBy } from 'lodash';
import {
  Filter as FilterType,
  FilterField,
  FilterViewInstance,
  FlattenFilterViewInstance,
} from '../../types/filters';

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
