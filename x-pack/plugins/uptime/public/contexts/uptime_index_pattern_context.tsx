/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import { useFetcher } from '../../../observability/public';
import { DataPublicPluginStart, IndexPattern } from '../../../../../src/plugins/data/public';

export const UptimeIndexPatternContext = createContext({} as IndexPattern);

export const UptimeIndexPatternContextProvider: React.FC<{ data: DataPublicPluginStart }> = ({
  children,
  data: { indexPatterns },
}) => {
  const { data } = useFetcher<Promise<IndexPattern>>(async () => {
    return indexPatterns.create({ pattern: 'heartbeat-*' });
  }, []);

  return <UptimeIndexPatternContext.Provider value={data!} children={children} />;
};

export const useIndexPattern = () => useContext(UptimeIndexPatternContext);
