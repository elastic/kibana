/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';
import dedent from 'dedent';

import { DOCUMENTS_API_JSON_EXAMPLE } from './constants';
import { DocumentCreationMode, DocumentCreationStep } from './types';

interface DocumentCreationValues {
  isDocumentCreationOpen: boolean;
  creationMode: DocumentCreationMode;
  creationStep: DocumentCreationStep;
  textInput: string;
  fileInput: File | null;
}

interface DocumentCreationActions {
  showCreationModes(): void;
  openDocumentCreation(creationMode: DocumentCreationMode): { creationMode: DocumentCreationMode };
  closeDocumentCreation(): void;
  setCreationStep(creationStep: DocumentCreationStep): { creationStep: DocumentCreationStep };
  setTextInput(textInput: string): { textInput: string };
  setFileInput(fileInput: File | null): { fileInput: File | null };
}

export const DocumentCreationLogic = kea<
  MakeLogicType<DocumentCreationValues, DocumentCreationActions>
>({
  path: ['enterprise_search', 'app_search', 'document_creation_logic'],
  actions: () => ({
    showCreationModes: () => null,
    openDocumentCreation: (creationMode) => ({ creationMode }),
    closeDocumentCreation: () => null,
    setCreationStep: (creationStep) => ({ creationStep }),
    setTextInput: (textInput) => ({ textInput }),
    setFileInput: (fileInput) => ({ fileInput }),
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
    textInput: [
      dedent(DOCUMENTS_API_JSON_EXAMPLE),
      {
        setTextInput: (_, { textInput }) => textInput,
      },
    ],
    fileInput: [
      null,
      {
        setFileInput: (_, { fileInput }) => fileInput,
      },
    ],
  }),
});
