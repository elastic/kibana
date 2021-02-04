/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useValues, useActions } from 'kea';

import { i18n } from '@kbn/i18n';
import {
  EuiOverlayMask,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
} from '@elastic/eui';

import { DocumentCreationLogic, DocumentCreationButtons } from './';
import { DocumentCreationStep } from './types';

export const DocumentCreationModal: React.FC = () => {
  const { closeDocumentCreation } = useActions(DocumentCreationLogic);
  const { isDocumentCreationOpen, creationMode, creationStep } = useValues(DocumentCreationLogic);

  if (!isDocumentCreationOpen) return null;

  return (
    <EuiOverlayMask>
      <EuiModal onClose={closeDocumentCreation}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            {i18n.translate('xpack.enterpriseSearch.appSearch.documentCreation.modalTitle', {
              defaultMessage: 'Document Import',
            })}
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          {creationStep === DocumentCreationStep.ShowError && <>DocumentCreationError</>}
          {creationStep === DocumentCreationStep.ShowCreationModes && <DocumentCreationButtons />}
          {creationStep === DocumentCreationStep.AddDocuments && creationMode === 'api' && (
            <>ApiCodeExample</>
          )}
          {creationStep === DocumentCreationStep.AddDocuments && creationMode === 'text' && (
            <>PasteJsonText</>
          )}
          {creationStep === DocumentCreationStep.AddDocuments && creationMode === 'file' && (
            <>UploadJsonFile</>
          )}
          {creationStep === DocumentCreationStep.ShowErrorSummary && <>DocumentCreationSummary</>}
          {creationStep === DocumentCreationStep.ShowSuccessSummary && <>DocumentCreationSummary</>}
        </EuiModalBody>
        <EuiModalFooter />
      </EuiModal>
    </EuiOverlayMask>
  );
};
