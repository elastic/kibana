/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick } from 'lodash/fp';
import { useCallback, useState, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { useDeepEqualSelector } from '../../hooks/use_selector';
import { inputsSelectors } from '../../store';
import { inputsActions } from '../../store/actions';
import { SetQuery, DeleteQuery } from './types';

export const useGlobalTime = (clearAllQuery: boolean = true) => {
  const dispatch = useDispatch();
  const { from, to } = useDeepEqualSelector((state) =>
    pick(['from', 'to'], inputsSelectors.globalTimeRangeSelector(state))
  );
  const [isInitializing, setIsInitializing] = useState(true);

  const setQuery = useCallback(
    ({ id, inspect, loading, refetch }: SetQuery) =>
      dispatch(inputsActions.setQuery({ inputId: 'global', id, inspect, loading, refetch })),
    [dispatch]
  );

  const deleteQuery = useCallback(
    ({ id }: DeleteQuery) => dispatch(inputsActions.deleteOneQuery({ inputId: 'global', id })),
    [dispatch]
  );

  useEffect(() => {
    if (isInitializing) {
      setIsInitializing(false);
    }
    return () => {
      if (clearAllQuery) {
        dispatch(inputsActions.deleteAllQuery({ id: 'global' }));
      }
    };
  }, [clearAllQuery, dispatch, isInitializing]);

  const memoizedReturn = useMemo(
    () => ({
      isInitializing,
      from,
      to,
      setQuery,
      deleteQuery,
    }),
    [deleteQuery, from, isInitializing, setQuery, to]
  );

  return memoizedReturn;
};

export type GlobalTimeArgs = Omit<ReturnType<typeof useGlobalTime>, 'deleteQuery'> &
  Partial<Pick<ReturnType<typeof useGlobalTime>, 'deleteQuery'>>;
