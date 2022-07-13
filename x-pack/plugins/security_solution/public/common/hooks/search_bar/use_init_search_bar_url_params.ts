/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useMemo } from 'react';
import type { Filter, Query } from '@kbn/es-query';
import { useKibana } from '../../lib/kibana';
import { inputsSelectors } from '../../store';
import { inputsActions } from '../../store/inputs';
import { useInitializeUrlParam } from '../../utils/global_query_string';
import { CONSTANTS } from '../../components/url_state/constants';

export const useInitSearchBarUrlParams = () => {
  const dispatch = useDispatch();
  const { filterManager, savedQueries } = useKibana().services.data.query;
  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const filtersFromStore = useSelector(getGlobalFiltersQuerySelector);

  const onInitializeAppQueryUrlParam = useCallback(
    (initialState: Query | null) => {
      if (initialState != null) {
        dispatch(
          inputsActions.setFilterQuery({
            id: 'global',
            query: initialState.query,
            language: initialState.language,
          })
        );
      }
    },
    [dispatch]
  );

  const onInitializeFiltersUrlParam = useCallback(
    (initialState: Filter[] | null) => {
      if (initialState != null) {
        filterManager.setFilters(initialState);
        dispatch(
          inputsActions.setSearchBarFilter({
            id: 'global',
            filters: initialState,
          })
        );
      } else {
        // Clear app filters and preserve pinned filters. It ensures that other App filters don't leak into security solution.
        filterManager.setAppFilters(filtersFromStore);

        dispatch(
          inputsActions.setSearchBarFilter({
            id: 'global',
            filters: filterManager.getFilters(),
          })
        );
      }
    },
    [filterManager, dispatch, filtersFromStore]
  );

  const onInitializeSavedQueryUrlParam = useCallback(
    (savedQueryId: string | null) => {
      if (savedQueryId != null && savedQueryId !== '') {
        savedQueries.getSavedQuery(savedQueryId).then((savedQueryData) => {
          const filters = savedQueryData.attributes.filters || [];
          const query = savedQueryData.attributes.query;

          filterManager.setFilters(filters);
          dispatch(
            inputsActions.setSearchBarFilter({
              id: 'global',
              filters,
            })
          );

          dispatch(
            inputsActions.setFilterQuery({
              id: 'global',
              ...query,
            })
          );
          dispatch(inputsActions.setSavedQuery({ id: 'global', savedQuery: savedQueryData }));
        });
      }
    },
    [dispatch, filterManager, savedQueries]
  );

  useInitializeUrlParam(CONSTANTS.appQuery, onInitializeAppQueryUrlParam);
  useInitializeUrlParam(CONSTANTS.filters, onInitializeFiltersUrlParam);
  useInitializeUrlParam(CONSTANTS.savedQuery, onInitializeSavedQueryUrlParam);
};
