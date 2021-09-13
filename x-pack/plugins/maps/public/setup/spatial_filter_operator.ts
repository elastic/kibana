/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FILTERS, getFilterParams } from '@kbn/es-query';
import { ReactElement } from 'react';

export const spatialFilterOperator = {
  message: i18n.translate('xpack.maps.filterOperator.spatialFilterLabel', {
    defaultMessage: 'spatial filter',
  }),
  type: FILTERS.SPATIAL_FILTER,
  negate: false,
  fieldTypes: ['geo_point', 'geo_shape'],
  editor: null,
  buildFilter: (
    indexPattern: IndexPatternBase,
    field: IndexPatternFieldBase,
    disabled: boolean,
    params: Serializable,
    alias: string | null,
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
      query: params.query
    };
    if (store) {
      filter.$state = { store };
    }
    return filter;
  },
  getFilterParams: (filter: Filter) => {
    return { query: filter.query };
  },
  isFilterValid: (
    indexPattern?: IIndexPattern,
    field?: IFieldType,
    params?: any,
  ) => {
    if (indexPattern && field) {
      return true;
    }

    if (params?.query) {
      return true;
    }

    return false;
  },
};
