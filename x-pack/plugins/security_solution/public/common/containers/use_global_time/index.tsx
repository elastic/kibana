/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { inputsSelectors } from '../../store';
import { inputsActions } from '../../store/actions';
import { SetQuery, DeleteQuery } from './types';

export const useGlobalTime = () => {
  const dispatch = useDispatch();
  const { from, to } = useSelector(inputsSelectors.globalTimeRangeSelector);
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
      dispatch(inputsActions.deleteAllQuery({ id: 'global' }));
    };
  }, [dispatch, isInitializing]);

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
