/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useMemo, useState } from 'react';

interface SharedData {
  totalPageViews: number;
}

interface Index {
  sharedData: SharedData;
  setSharedData: (data: SharedData) => void;
}

const defaultContext: Index = {
  sharedData: { totalPageViews: 0 },
  setSharedData: (d) => {
    throw new Error(
      'setSharedData was not initialized, set it when you invoke the context'
    );
  },
};

export const CsmSharedContext = createContext(defaultContext);

export function CsmSharedContextProvider({
  children,
}: {
  children: JSX.Element;
}) {
  const [newData, setNewData] = useState<SharedData>({ totalPageViews: 0 });

  const setSharedData = React.useCallback((data: SharedData) => {
    setNewData(data);
  }, []);

  const value = useMemo(() => {
    return { sharedData: newData, setSharedData };
  }, [newData, setSharedData]);

  return <CsmSharedContext.Provider value={value} children={children} />;
}
