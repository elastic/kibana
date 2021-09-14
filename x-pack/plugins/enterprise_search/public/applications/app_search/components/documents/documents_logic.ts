/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

interface DocumentsLogicValues {
  isDocumentCreationOpen: boolean;
}

interface DocumentsLogicActions {
  closeDocumentCreation(): void;
  openDocumentCreation(): void;
}

type DocumentsLogicType = MakeLogicType<DocumentsLogicValues, DocumentsLogicActions>;

export const DocumentsLogic = kea<DocumentsLogicType>({
  path: ['enterprise_search', 'app_search', 'documents_logic'],
  actions: () => ({
    openDocumentCreation: true,
    closeDocumentCreation: true,
  }),
  reducers: () => ({
    isDocumentCreationOpen: [
      false,
      {
        openDocumentCreation: () => true,
        closeDocumentCreation: () => false,
      },
    ],
  }),
});
