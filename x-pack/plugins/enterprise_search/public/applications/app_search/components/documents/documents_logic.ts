/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';

export interface DocumentsLogicValues {
  isDocumentCreationOpen: boolean;
}

export interface DocumentsLogicActions {
  closeDocumentCreation(): void;
  openDocumentCreation(): void;
}

type DocumnetsLogicType = MakeLogicType<DocumentsLogicValues, DocumentsLogicActions>;

export const DocumentsLogic = kea<DocumnetsLogicType>({
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
