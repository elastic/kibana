/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, type FunctionComponent } from 'react';
import { FileKindsRegistry, getFileKindsRegistry } from '../../common/file_kinds_registry';

export interface FilesContextValue {
  registry: FileKindsRegistry;
}

const FilesContextObject = createContext<FilesContextValue>(null as unknown as FilesContextValue);

export const useFilesContext = () => {
  const ctx = useContext(FilesContextObject);
  if (!ctx) {
    throw new Error('FilesContext is not found!');
  }
  return ctx;
};
export const FilesContext: FunctionComponent = ({ children }) => {
  return (
    <FilesContextObject.Provider
      value={{
        registry: getFileKindsRegistry(),
      }}
    >
      {children}
    </FilesContextObject.Provider>
  );
};
