/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { Filter } from '@kbn/es-query';
import {
  fieldAndValueValid,
  getIndicatorFieldAndValue,
  useIndicatorsFiltersContext,
} from '../../indicators';
import { Indicator } from '../../../../common/types/indicator';
import { FilterIn, FilterOut, updateFiltersArray } from '../utils';

export interface UseFilterInParam {
  /**
   * Indicator used to retrieve the field and value then use to update the filters
   */
  indicator: Indicator | string;
  /**
   * Value used to filter in /out in the KQL bar.
   */
  field: string;
  /**
   * To filter in or out.
   */
  filterType: typeof FilterIn | typeof FilterOut;
}

export interface UseFilterInValue {
  /**
   * Filter function to run on click event.
   */
  filterFn: (() => void) | undefined;
}

/**
 * Custom hook that uses an indicator, a field and a type (FilterIn or FilterOut) and returns the filter function.
 *
 */
export const useFilterInOut = ({
  indicator,
  field,
  filterType,
}: UseFilterInParam): UseFilterInValue => {
  const { filterManager } = useIndicatorsFiltersContext();

  const { key, value } =
    typeof indicator === 'string'
      ? { key: field, value: indicator }
      : getIndicatorFieldAndValue(indicator, field);

  const filterFn = useCallback((): void => {
    const existingFilters = filterManager.getFilters();
    const newFilters: Filter[] = updateFiltersArray(existingFilters, key, value, filterType);
    filterManager.setFilters(newFilters);
  }, [filterManager, filterType, key, value]);

  if (!fieldAndValueValid(key, value)) {
    return {} as unknown as UseFilterInValue;
  }

  return {
    filterFn,
  };
};
