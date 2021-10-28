/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flowRight, identity } from 'lodash';
import { filterViewsRegistry } from '../filter_view_types/intex';

const flattenFilterView = (filterValue: any) => (filterView: any) =>
  Object.keys(filterView).reduce((acc, key) => {
    if (typeof filterView[key] === 'function') {
      const val = filterView[key](filterValue[key]);
      return { ...acc, ...val };
    }
    return { ...acc, [key]: filterView[key] };
  }, {});

const formatFilterView = (filterValue: any) => (filterView: any) =>
  Object.keys(filterView).reduce(
    (acc, key) => ({
      ...acc,
      [key]: {
        label: filterView[key].label,
        formattedValue: (filterView[key].formatter ?? identity)(filterValue[key]),
      },
    }),
    {}
  );

export const transformFilterView = (filterView: any) => (filterValue: any) =>
  flowRight(formatFilterView(filterValue), flattenFilterView(filterValue))(filterView);

export const getFilterFormatter = (type: string = '') => {
  const filterView = filterViewsRegistry.get(type) ?? filterViewsRegistry.get('default');
  return transformFilterView(filterView.view());
};
