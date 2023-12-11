/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestAdapter } from '@kbn/inspector-plugin/common';
import React, { createContext, FC, useMemo } from 'react';

export interface InspectorContextValue {
  requests: RequestAdapter;
}

export const InspectorContext = createContext<InspectorContextValue | undefined>(undefined);

export const InspectorProvider: FC = ({ children }) => {
  const inspectorAdapters = useMemo(() => ({ requests: new RequestAdapter() }), []);

  return (
    <InspectorContext.Provider value={inspectorAdapters}>{children}</InspectorContext.Provider>
  );
};
