/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';

interface Props {
  stopPipelineSimulation: () => void;
  closeModal: () => void;
}

const i18nTexts = {
  modalTitle: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.testPipeline.resetDocumentsModal.title',
    {
      defaultMessage: 'Reset',
    }
  ),
  modalDescription: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.testPipeline.resetDocumentsModal.description',
    {
      defaultMessage: 'Reset documents and stop pipeline simulation.',
    }
  ),
  cancelButtonLabel: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.testPipeline.resetDocumentsModal.cancelButtonLabel',
    {
      defaultMessage: 'Cancel',
    }
  ),
  resetButtonLabel: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.testPipeline.resetDocumentsModal.resetButtonLabel',
    {
      defaultMessage: 'Reset',
    }
  ),
};

export const ResetDocumentsModal: FunctionComponent<Props> = ({
  stopPipelineSimulation,
  closeModal,
}) => {
  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        buttonColor="danger"
        data-test-subj="resetDocumentsConfirmationModal"
        title={i18nTexts.modalTitle}
        onCancel={closeModal}
        onConfirm={stopPipelineSimulation}
        cancelButtonText={i18nTexts.cancelButtonLabel}
        confirmButtonText={i18nTexts.resetButtonLabel}
      >
        <p>{i18nTexts.modalDescription}</p>
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};
