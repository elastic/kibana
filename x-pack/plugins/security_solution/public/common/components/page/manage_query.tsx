/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Position } from '@elastic/charts';
import { omit } from 'lodash/fp';
import React, { useCallback, useEffect } from 'react';

import { useDispatch } from 'react-redux';
import type { inputsModel } from '../../store';
import type { GlobalTimeArgs } from '../../containers/use_global_time';
import { inputsActions } from '../../store/actions';

export interface OwnProps extends Pick<GlobalTimeArgs, 'deleteQuery' | 'setQuery'> {
  headerChildren?: React.ReactNode;
  id: string;
  legendPosition?: Position;
  loading: boolean;
  refetch?: inputsModel.Refetch;
  inspect?: inputsModel.InspectQuery;
}

export function manageQuery<T>(
  WrappedComponent: React.ComponentClass<T> | React.ComponentType<T>
): React.FC<OwnProps & T> {
  const ManageQuery = (props: OwnProps & T) => {
    const { loading, id, refetch, setQuery, deleteQuery, inspect = null } = props;
    const dispatch = useDispatch();

    const refetchByToggleComponent = useCallback(() => {
      dispatch(
        inputsActions.setInspectionParameter({
          id,
          selectedInspectIndex: 0,
          isRefreshing: true,
          isInspected: false,
          inputId: 'global',
        })
      );

      setTimeout(() => {
        dispatch(
          inputsActions.setInspectionParameter({
            id,
            selectedInspectIndex: 0,
            isRefreshing: false,
            isInspected: false,
            inputId: 'global',
          })
        );
      }, 100);
    }, [dispatch, id]);

    useQueryInspector({
      queryId: id,
      loading,
      refetch: refetch ?? refetchByToggleComponent,
      setQuery,
      deleteQuery,
      inspect,
    });

    const otherProps = omit(['refetch', 'setQuery'], props);
    return <WrappedComponent {...(otherProps as T)} />;
  };

  ManageQuery.displayName = `ManageQuery (${WrappedComponent?.displayName ?? 'Unknown'})`;
  return ManageQuery;
}

interface UseQueryInspectorTypes extends Pick<GlobalTimeArgs, 'deleteQuery' | 'setQuery'> {
  queryId: string;
  legendPosition?: Position;
  loading: boolean;
  refetch: inputsModel.Refetch;
  inspect?: inputsModel.InspectQuery | null;
}

export const useQueryInspector = ({
  setQuery,
  deleteQuery,
  refetch,
  inspect,
  loading,
  queryId,
}: UseQueryInspectorTypes) => {
  useEffect(() => {
    setQuery({ id: queryId, inspect: inspect ?? null, loading, refetch });
  }, [deleteQuery, setQuery, queryId, refetch, inspect, loading]);

  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: queryId });
      }
    };
  }, [deleteQuery, queryId]);
};
