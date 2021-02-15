/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { DocumentCreationMode, DocumentCreationStep } from './types';

interface DocumentCreationValues {
  isDocumentCreationOpen: boolean;
  creationMode: DocumentCreationMode;
  creationStep: DocumentCreationStep;
}

interface DocumentCreationActions {
  showCreationModes(): void;
  openDocumentCreation(creationMode: DocumentCreationMode): { creationMode: DocumentCreationMode };
  closeDocumentCreation(): void;
  setCreationStep(creationStep: DocumentCreationStep): { creationStep: DocumentCreationStep };
}

export const DocumentCreationLogic = kea<
  MakeLogicType<DocumentCreationValues, DocumentCreationActions>
>({
  path: ['enterprise_search', 'app_search', 'document_creation_modal_logic'],
  actions: () => ({
    showCreationModes: () => null,
    openDocumentCreation: (creationMode) => ({ creationMode }),
    closeDocumentCreation: () => null,
    setCreationStep: (creationStep) => ({ creationStep }),
  }),
  reducers: () => ({
    isDocumentCreationOpen: [
      false,
      {
        showCreationModes: () => true,
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
        showCreationModes: () => DocumentCreationStep.ShowCreationModes,
        openDocumentCreation: () => DocumentCreationStep.AddDocuments,
        setCreationStep: (_, { creationStep }) => creationStep,
      },
    ],
  }),
});
