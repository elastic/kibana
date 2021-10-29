/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flowRight } from 'lodash';
import {
  Filter as FilterType,
  FilterViewInstance,
  FlattenFilterViewInstance,
} from '../../types/filters';
import { filterViewsRegistry } from '../filter_view_types';

const defaultFormatter = (value: unknown) => (value ? `${value}` : '-');

const formatFilterView = (filterValue: FilterType) => (filterView: FlattenFilterViewInstance) => {
  const filterViewKeys = Object.keys(filterView) as Array<keyof FilterViewInstance>;
  return filterViewKeys.reduce(
    (acc, key) => ({
      ...acc,
      [key]: {
        label: filterView[key].label,
        formattedValue: (filterView[key].formatter ?? defaultFormatter)(filterValue[key]),
      },
    }),
    {}
  );
};

const flattenFilterView = (filterValue: FilterType) => (filterView: FilterViewInstance) => {
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

export const transformFilterView = (filterView: FilterViewInstance) => (filterValue: FilterType) =>
  flowRight(formatFilterView(filterValue), flattenFilterView(filterValue))(filterView);

export const getFilterFormatter = (type: string = '') => {
  const filterView = filterViewsRegistry.get(type) ?? filterViewsRegistry.get('default');
  return transformFilterView(filterView.view());
};
