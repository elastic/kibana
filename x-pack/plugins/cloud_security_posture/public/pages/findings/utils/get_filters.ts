/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type Filter,
  buildFilter,
  FILTERS,
  FilterStateStore,
  compareFilters,
  FilterCompareOptions,
} from '@kbn/es-query';
import type { Serializable } from '@kbn/utility-types';
import type { FindingsBaseProps } from '../types';

const compareOptions: FilterCompareOptions = {
  negate: false,
};

/**
 * adds a new filter to a new filters array
 * removes existing filter if negated filter is added
 *
 * @returns {Filter[]} a new array of filters to be added back to filterManager
 */
export const getFilters = ({
  filters: existingFilters,
  dataView,
  field,
  value,
  negate,
}: {
  filters: Filter[];
  dataView: FindingsBaseProps['dataView'];
  field: string;
  value: Serializable;
  negate: boolean;
}): Filter[] => {
  const dataViewField = dataView.getFieldByName(field);
  if (!dataViewField) return existingFilters;

  const phraseFilter = buildFilter(
    dataView,
    dataViewField,
    FILTERS.PHRASE,
    negate,
    false,
    value,
    null,
    FilterStateStore.APP_STATE
  );

  const nextFilters = [
    ...existingFilters.filter(
      // Exclude existing filters that match the newly added 'phraseFilter'
      (filter) => !compareFilters(filter, phraseFilter, compareOptions)
    ),
    phraseFilter,
  ];

  return nextFilters;
};
