/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash/fp';
import { useCallback, useState, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { InputsModelId } from '../../store/inputs/constants';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { inputsSelectors } from '../../store';
import { inputsActions } from '../../store/actions';
import type { SetQuery, DeleteQuery } from './types';

export const useGlobalTime = (clearAllQuery: boolean = true) => {
  const dispatch = useDispatch();
  const { from, to } = useDeepEqualSelector((state) =>
    pick(['from', 'to'], inputsSelectors.globalTimeRangeSelector(state))
  );
  const [isInitializing, setIsInitializing] = useState(true);

  const setQuery = useCallback(
    ({ id, inspect, loading, refetch }: SetQuery) =>
      dispatch(
        inputsActions.setQuery({ inputId: InputsModelId.global, id, inspect, loading, refetch })
      ),
    [dispatch]
  );

  const deleteQuery = useCallback(
    ({ id }: DeleteQuery) =>
      dispatch(inputsActions.deleteOneQuery({ inputId: InputsModelId.global, id })),
    [dispatch]
  );

  useEffect(() => {
    setIsInitializing(false);
  }, []);

  // This effect must not have any mutable dependencies. Otherwise, the cleanup function gets called before the component unmounts.
  useEffect(() => {
    return () => {
      if (clearAllQuery) {
        dispatch(inputsActions.deleteAllQuery({ id: InputsModelId.global }));
      }
    };
  }, [dispatch, clearAllQuery]);

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
