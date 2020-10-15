/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButton,
  EuiOverlayMask,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButtonEmpty,
} from '@elastic/eui';

const MAX_MODAL_WIDTH = 1200;

interface Props {
  onCreateClick(): void;
  closeModal(): void;
  saveEnabled: boolean;
}

export const ModalWrapper: FC<Props> = ({ onCreateClick, closeModal, saveEnabled, children }) => {
  return (
    <EuiOverlayMask>
      <EuiModal
        onClose={closeModal}
        maxWidth={MAX_MODAL_WIDTH}
        data-test-subj="mlCreateDetectorModal"
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <FormattedMessage
              id="xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.title"
              defaultMessage="Create detector"
            />
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>{children}</EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={closeModal} data-test-subj="mlCreateDetectorModalCancelButton">
            <FormattedMessage
              id="xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.cancelButton"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>

          <EuiButton
            onClick={onCreateClick}
            isDisabled={saveEnabled === false}
            fill
            data-test-subj="mlCreateDetectorModalSaveButton"
          >
            <FormattedMessage
              id="xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorModal.saveButton"
              defaultMessage="Save"
            />
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
