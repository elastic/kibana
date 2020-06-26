/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { uiSelector } from '../state/selectors';
import { parseFiltersMap } from '../components/overview/filter_group/parse_filter_map';
import { setUiState } from '../state/actions';
import { FilterMap } from '../../common/types';

export const useSelectedFilters = (): [FilterMap, (filterMap: FilterMap) => void] => {
  const { selectedFilters } = useSelector(uiSelector);
  const parsed = useMemo(() => parseFiltersMap(selectedFilters), [selectedFilters]);
  const dispatch = useDispatch();
  const updateFilters = useCallback(
    (filterMap: FilterMap) => {
      const filterString = JSON.stringify(filterMap);
      if (selectedFilters !== filterString) {
        dispatch(
          setUiState({
            selectedFilters: filterString,
          })
        );
      }
    },
    [dispatch, selectedFilters]
  );

  return [parsed, updateFilters];
};
