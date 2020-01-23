/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, createContext, useState } from 'react';
import { Operation, Shard } from '../../types';

const HighlightContext = createContext<{
  selectedRow: string;
  setStore: (args: OnHighlightChangeArgs & { id: string }) => void;
}>(null as any);

export interface OnHighlightChangeArgs {
  indexName: string;
  shard: Shard;
  operation: Operation;
}

type OnHighlightChangeHandler = (data: OnHighlightChangeArgs) => void;

export const HighlightContextProvider = ({
  children,
  onHighlight,
}: {
  children: React.ReactNode;
  onHighlight: OnHighlightChangeHandler;
}) => {
  const [selectedRow, setSelectedRow] = useState<string>('');
  return (
    <HighlightContext.Provider
      value={{
        selectedRow,
        setStore: ({ id, ...onHighlightChangeArgs }: OnHighlightChangeArgs & { id: string }) => {
          onHighlight(onHighlightChangeArgs);
          setSelectedRow(id);
        },
      }}
    >
      {children}
    </HighlightContext.Provider>
  );
};

export const useHighlightContext = () => {
  const ctx = useContext(HighlightContext);
  if (ctx == null) {
    throw new Error(`useHighlightContext must be called inside HighlightContext`);
  }
  return ctx;
};
