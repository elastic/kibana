/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiConfirmModal, EUI_MODAL_CANCEL_BUTTON, EuiOverlayMask } from '@elastic/eui';
import { PIPELINE_EDITOR } from './constants';

export function ConfirmDeletePipelineModal({ id, cancelDeleteModal, confirmDeletePipeline }) {
  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        buttonColor="danger"
        cancelButtonText="Cancel"
        confirmButtonText="Delete pipeline"
        defaultFocusedButton={EUI_MODAL_CANCEL_BUTTON}
        onCancel={cancelDeleteModal}
        onConfirm={confirmDeletePipeline}
        title={`Delete pipeline ${id}`}
      >
        <p>{PIPELINE_EDITOR.DELETE_PIPELINE_MODAL_MESSAGE}</p>
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
}

ConfirmDeletePipelineModal.propTypes = {
  cancelDeleteModal: PropTypes.func.isRequired,
  confirmDeletePipeline: PropTypes.func.isRequired,
  id: PropTypes.string.isRequired,
};
