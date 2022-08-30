/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import { useFetcher } from '@kbn/observability-plugin/public';
import { DataViewsPublicPluginStart, DataView } from '@kbn/data-views-plugin/public';
import { useHasData } from '../components/monitors_page/overview/empty_state/use_has_data';

export const SyntheticsDataViewContext = createContext({} as DataView);

export const SyntheticsDataViewContextProvider: React.FC<{
  dataViews: DataViewsPublicPluginStart;
}> = ({ children, dataViews }) => {
  const { settings, data: indexStatus } = useHasData();

  const heartbeatIndices = settings?.heartbeatIndices || '';

  const { data } = useFetcher<Promise<DataView | undefined>>(async () => {
    if (heartbeatIndices && indexStatus?.indexExists) {
      // this only creates an dateView in memory, not as saved object
      return dataViews.create({ title: heartbeatIndices });
    }
  }, [heartbeatIndices, indexStatus?.indexExists]);

  return <SyntheticsDataViewContext.Provider value={data!} children={children} />;
};

export const useSyntheticsDataView = () => useContext(SyntheticsDataViewContext);
