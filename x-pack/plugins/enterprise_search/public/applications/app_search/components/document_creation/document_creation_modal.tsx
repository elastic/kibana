/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues, useActions } from 'kea';

import { EuiOverlayMask, EuiModal } from '@elastic/eui';

import { DocumentCreationLogic } from './';
import { DocumentCreationStep } from './types';

import {
  ShowCreationModes,
  ApiCodeExample,
  PasteJsonText,
  UploadJsonFile,
} from './creation_mode_components';

export const DocumentCreationModal: React.FC = () => {
  const { closeDocumentCreation } = useActions(DocumentCreationLogic);
  const { isDocumentCreationOpen } = useValues(DocumentCreationLogic);

  return isDocumentCreationOpen ? (
    <EuiOverlayMask>
      <EuiModal onClose={closeDocumentCreation}>
        <ModalContent />
      </EuiModal>
    </EuiOverlayMask>
  ) : null;
};

export const ModalContent: React.FC = () => {
  const { creationStep, creationMode } = useValues(DocumentCreationLogic);

  switch (creationStep) {
    case DocumentCreationStep.ShowCreationModes:
      return <ShowCreationModes />;
    case DocumentCreationStep.AddDocuments:
      switch (creationMode) {
        case 'api':
          return <ApiCodeExample />;
        case 'text':
          return <PasteJsonText />;
        case 'file':
          return <UploadJsonFile />;
      }
    case DocumentCreationStep.ShowError:
      return <>DocumentCreationError</>;
    case DocumentCreationStep.ShowErrorSummary:
      return <>DocumentCreationSummary</>;
    case DocumentCreationStep.ShowSuccessSummary:
      return <>DocumentCreationSummary</>;
  }
};
