/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiConfirmModal, EUI_MODAL_CANCEL_BUTTON, EuiOverlayMask } from '@elastic/eui';

export function ConfirmDeleteModal({
  cancelDeletePipelines,
  deleteSelectedPipelines,
  selection,
  showConfirmDeleteModal,
}) {
  if (!showConfirmDeleteModal) {
    return null;
  }
  const numPipelinesSelected = selection.length;

  const confirmText =
    numPipelinesSelected === 1
      ? {
        message: 'You cannot recover a deleted pipeline',
        button: `Delete pipeline`,
        title: `Delete pipeline "${selection[0].id}"`,
      }
      : {
        message: `You cannot recover deleted pipelines.`,
        button: `Delete ${numPipelinesSelected} pipelines`,
        title: `Delete ${numPipelinesSelected} pipelines`,
      };

  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        buttonColor="danger"
        cancelButtonText="Cancel"
        confirmButtonText={confirmText.button}
        defaultFocusedButton={EUI_MODAL_CANCEL_BUTTON}
        onCancel={cancelDeletePipelines}
        onConfirm={deleteSelectedPipelines}
        title={confirmText.title}
      >
        <p>{confirmText.message}</p>
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
}
