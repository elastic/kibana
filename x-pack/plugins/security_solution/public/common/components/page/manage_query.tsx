/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Position } from '@elastic/charts';
import { noop, omit } from 'lodash/fp';
import React, { useEffect } from 'react';

import type { inputsModel } from '../../store';
import type { GlobalTimeArgs } from '../../containers/use_global_time';
import { useRefetchByRestartingSession } from './use_refetch_by_session';
import { InputsModelId } from '../../store/inputs/constants';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';

export interface OwnProps extends Pick<GlobalTimeArgs, 'deleteQuery' | 'setQuery'> {
  headerChildren?: React.ReactNode;
  id: string;
  inputId?: InputsModelId;
  inspect?: inputsModel.InspectQuery;
  legendPosition?: Position;
  loading: boolean;
  refetch?: inputsModel.Refetch;
}

export function manageQuery<T>(
  WrappedComponent: React.ComponentClass<T> | React.ComponentType<T>
): React.FC<OwnProps & T> {
  const ManageQuery = (props: OwnProps & T) => {
    const isChartEmbeddablesEnabled = useIsExperimentalFeatureEnabled('chartEmbeddablesEnabled');

    const {
      deleteQuery,
      id,
      inputId = InputsModelId.global,
      inspect = null,
      loading,
      refetch,
      setQuery,
    } = props;
    const { searchSessionId, refetchByRestartingSession } = useRefetchByRestartingSession({
      inputId,
      queryId: id,
    });

    useQueryInspector({
      deleteQuery,
      inspect,
      loading,
      queryId: id,
      refetch: isChartEmbeddablesEnabled ? refetchByRestartingSession : refetch ?? noop, // refetchByRestartingSession is for refetching Lens Embeddables
      searchSessionId,
      setQuery,
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
  searchSessionId?: string;
}

export const useQueryInspector = ({
  setQuery,
  deleteQuery,
  refetch,
  inspect,
  loading,
  queryId,
  searchSessionId,
}: UseQueryInspectorTypes) => {
  useEffect(() => {
    setQuery({ id: queryId, inspect: inspect ?? null, loading, refetch, searchSessionId });
  }, [deleteQuery, setQuery, queryId, refetch, inspect, loading, searchSessionId]);

  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: queryId });
      }
    };
  }, [deleteQuery, queryId]);
};
