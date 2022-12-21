/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useFetcher } from '@kbn/observability-plugin/public';
import { DataViewsPublicPluginStart, DataView } from '@kbn/data-views-plugin/public';
import { useDispatch, useSelector } from 'react-redux';
import { IHttpSerializedFetchError } from '../state/utils/http_error';
import { getIndexStatus, selectIndexState } from '../state';

export const SyntheticsDataViewContext = createContext(
  {} as {
    dataView?: DataView;
    loading?: boolean;
    indices?: string;
    error?: IHttpSerializedFetchError | null;
    hasData?: boolean;
  }
);

export const SyntheticsDataViewContextProvider: React.FC<{
  dataViews: DataViewsPublicPluginStart;
}> = ({ children, dataViews }) => {
  const { loading: hasDataLoading, error, data: indexStatus } = useSelector(selectIndexState);

  const heartbeatIndices = indexStatus?.indices || '';

  const dispatch = useDispatch();

  const hasData = Boolean(indexStatus?.indexExists);

  useEffect(() => {
    dispatch(getIndexStatus());
  }, [dispatch]);

  const { data, loading } = useFetcher<Promise<DataView | undefined>>(async () => {
    if (heartbeatIndices && indexStatus?.indexExists) {
      // this only creates an dateView in memory, not as saved object
      return dataViews.create({ title: heartbeatIndices });
    }
  }, [heartbeatIndices, indexStatus?.indexExists]);

  const isLoading = loading || hasDataLoading;

  const value = useMemo(() => {
    return { dataView: data, indices: heartbeatIndices, isLoading, error, hasData };
  }, [data, heartbeatIndices, isLoading, error, hasData]);

  return <SyntheticsDataViewContext.Provider value={value} children={children} />;
};

export const useSyntheticsDataView = () => useContext(SyntheticsDataViewContext);
