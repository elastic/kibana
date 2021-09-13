/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FILTERS } from '@kbn/es-query';
import type {
  Filter,
  FilterStateStore,
  IndexPatternBase,
  IndexPatternFieldBase,
} from '@kbn/es-query';
import type { IFieldType, IIndexPattern } from 'src/plugins/data/public';

export const spatialFilterOperator = {
  message: i18n.translate('xpack.maps.filterOperator.spatialFilterLabel', {
    defaultMessage: 'spatial filter',
  }),
  type: FILTERS.SPATIAL_FILTER,
  negate: false,
  fieldTypes: ['geo_point', 'geo_shape'],
  editor: null,
  buildFilter: (
    disabled: boolean,
    alias: string | null,
    indexPattern?: IndexPatternBase,
    field?: IndexPatternFieldBase,
    params?: any,
    store?: FilterStateStore
  ) => {
    const filter: Filter = {
      meta: {
        alias,
        negate: false,
        disabled,
        isMultiIndex: true,
        type: FILTERS.SPATIAL_FILTER,
      },
      query: params.query,
    };
    if (store) {
      filter.$state = { store };
    }
    return filter;
  },
  getFilterParams: (filter: Filter) => {
    return { query: filter.query };
  },
  isFilterValid: (indexPattern?: IIndexPattern, field?: IFieldType, params?: any) => {
    if (indexPattern && field) {
      return true;
    }

    if (params?.query) {
      return true;
    }

    return false;
  },
};
