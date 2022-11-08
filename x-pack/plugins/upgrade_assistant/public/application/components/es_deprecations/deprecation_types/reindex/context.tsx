/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';

import { ApiService } from '../../../../lib/api';
import { useReindexStatus, ReindexState } from './use_reindex_state';

export interface ReindexStateContext {
  reindexState: ReindexState;
  startReindex: () => Promise<void>;
  cancelReindex: () => Promise<void>;
}

const ReindexContext = createContext<ReindexStateContext | undefined>(undefined);

export const useReindexContext = () => {
  const context = useContext(ReindexContext);
  if (context === undefined) {
    throw new Error('useReindexContext must be used within a <ReindexStatusProvider />');
  }
  return context;
};

interface Props {
  api: ApiService;
  children: React.ReactNode;
  indexName: string;
}

export const ReindexStatusProvider: React.FunctionComponent<Props> = ({
  api,
  indexName,
  children,
}) => {
  const { reindexState, startReindex, cancelReindex } = useReindexStatus({
    indexName,
    api,
  });

  return (
    <ReindexContext.Provider
      value={{
        reindexState,
        startReindex,
        cancelReindex,
      }}
    >
      {children}
    </ReindexContext.Provider>
  );
};
