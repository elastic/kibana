/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';

import { DocumentCreationMode, DocumentCreationStep } from './types';

interface DocumentCreationValues {
  isDocumentCreationOpen: boolean;
  creationMode: DocumentCreationMode;
  creationStep: DocumentCreationStep;
}

interface DocumentCreationActions {
  openDocumentCreation(creationMode: DocumentCreationMode): { creationMode: DocumentCreationMode };
  closeDocumentCreation(): void;
  setCreationStep(creationStep: DocumentCreationStep): { creationStep: DocumentCreationStep };
}

export const DocumentCreationLogic = kea<
  MakeLogicType<DocumentCreationValues, DocumentCreationActions>
>({
  path: ['enterprise_search', 'app_search', 'document_creation_modal_logic'],
  actions: () => ({
    openDocumentCreation: (creationMode) => ({ creationMode }),
    closeDocumentCreation: () => null,
    setCreationStep: (creationStep) => ({ creationStep }),
  }),
  reducers: () => ({
    isDocumentCreationOpen: [
      false,
      {
        openDocumentCreation: () => true,
        closeDocumentCreation: () => false,
      },
    ],
    creationMode: [
      'text',
      {
        openDocumentCreation: (_, { creationMode }) => creationMode,
      },
    ],
    creationStep: [
      DocumentCreationStep.AddDocuments,
      {
        setCreationStep: (_, { creationStep }) => creationStep,
      },
    ],
  }),
});
