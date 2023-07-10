/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useMemo, useState, useContext } from 'react';

import { SearchResult } from '@elastic/search-ui';

export type SelectedDocument = SearchResult;
export interface DocumentContextType {
  selectedDocument: null | SelectedDocument;
  setSelectedDocument(select: null | SelectedDocument): void;
}

export const DocumentContext = createContext<DocumentContextType>({
  selectedDocument: null,
  setSelectedDocument: () => {},
});

export const DocumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedDocument, setSelectedDocument] = useState<SelectedDocument | null>(null);
  const value = useMemo(
    () => ({ selectedDocument, setSelectedDocument }),
    [selectedDocument, setSelectedDocument]
  );

  return <DocumentContext.Provider value={value}>{children}</DocumentContext.Provider>;
};

export const useSelectedDocument = () => useContext(DocumentContext);
