/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import { useSelector } from 'react-redux';
import { useFetcher } from '../../../observability/public';
import { DataPublicPluginStart, IndexPattern } from '../../../../../src/plugins/data/public';
import { selectDynamicSettings } from '../state/selectors';

export const UptimeIndexPatternContext = createContext({} as IndexPattern);

export const UptimeIndexPatternContextProvider: React.FC<{ data: DataPublicPluginStart }> = ({
  children,
  data: { indexPatterns },
}) => {
  const { settings } = useSelector(selectDynamicSettings);

  const heartbeatIndices = settings?.heartbeatIndices || '';

  const { data } = useFetcher<Promise<IndexPattern | undefined>>(async () => {
    if (heartbeatIndices) {
      return indexPatterns.create({ title: heartbeatIndices });
    }
  }, [heartbeatIndices]);

  return <UptimeIndexPatternContext.Provider value={data!} children={children} />;
};

export const useIndexPattern = () => useContext(UptimeIndexPatternContext);
