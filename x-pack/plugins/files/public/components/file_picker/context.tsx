/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { FunctionComponent } from 'react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { FilePickerState, createFilePickerState } from './file_picker_state';

interface FilePickerContextValue {
  state: FilePickerState;
  kind: string;
}

const FilePickerCtx = createContext<FilePickerContextValue>(
  null as unknown as FilePickerContextValue
);

interface FilePickerContextProps {
  kind: string;
}
export const FilePickerContext: FunctionComponent<FilePickerContextProps> = ({
  kind,
  children,
}) => {
  const client = useMemo(() => new QueryClient(), []);
  const state = useMemo(createFilePickerState, []);
  return (
    <QueryClientProvider client={client}>
      <FilePickerCtx.Provider value={{ state, kind }}>{children}</FilePickerCtx.Provider>
    </QueryClientProvider>
  );
};

export const useFilePickerContext = (): FilePickerContextValue => {
  const ctx = useContext(FilePickerCtx);
  if (!ctx) throw new Error('FilePickerContext not found!');
  return ctx;
};
