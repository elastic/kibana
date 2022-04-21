/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import { useFetcher } from '@kbn/observability-plugin/public';
import { DataPublicPluginStart, IndexPattern } from '@kbn/data-plugin/public';
import { useHasData } from '../components/overview/empty_state/use_has_data';

export const UptimeIndexPatternContext = createContext({} as IndexPattern);

export const UptimeIndexPatternContextProvider: React.FC<{ data: DataPublicPluginStart }> = ({
  children,
  data: { indexPatterns },
}) => {
  const { settings, data: indexStatus } = useHasData();

  const heartbeatIndices = settings?.heartbeatIndices || '';

  const { data } = useFetcher<Promise<IndexPattern | undefined>>(async () => {
    if (heartbeatIndices && indexStatus?.indexExists) {
      // this only creates an index pattern in memory, not as saved object
      return indexPatterns.create({ title: heartbeatIndices });
    }
  }, [heartbeatIndices, indexStatus?.indexExists]);

  return <UptimeIndexPatternContext.Provider value={data!} children={children} />;
};

export const useIndexPattern = () => useContext(UptimeIndexPatternContext);
