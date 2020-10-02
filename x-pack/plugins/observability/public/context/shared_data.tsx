/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useMemo, useState } from 'react';
import { HasDataResponse, ObservabilityFetchDataPlugins } from '../typings/fetch_overview_data';

interface SharedData {
  hasData: Record<ObservabilityFetchDataPlugins, HasDataResponse | undefined> | null;
  hasAnyData?: HasDataResponse;
}

interface Index {
  sharedData: SharedData | null;
  setSharedData: (data: SharedData) => void;
}

const defaultContext: Index = {
  sharedData: null,
  setSharedData: (d) => {
    throw new Error('setSharedData was not initialized, set it when you invoke the context');
  },
};

export const ObsvSharedContext = createContext(defaultContext);

export function ObsvSharedContextProvider({ children }: { children: JSX.Element }) {
  const [newData, setNewData] = useState<SharedData | null>(null);

  const setSharedData = React.useCallback((data: SharedData) => {
    setNewData(data);
  }, []);

  const value = useMemo(() => {
    return { sharedData: newData, setSharedData };
  }, [newData, setSharedData]);

  return <ObsvSharedContext.Provider value={value} children={children} />;
}
