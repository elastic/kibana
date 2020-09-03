/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCode,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

interface DeleteModalProps {
  closeModal: () => void;
  deleteMonitor: () => void;
  monitorName: string;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({
  closeModal,
  deleteMonitor,
  monitorName,
}) => (
  <EuiOverlayMask onClick={closeModal}>
    <EuiModal onClose={closeModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="xpack.uptime.monitorListDrawer.deleteModal.modalHeader"
            defaultMessage="Delete {monitorName}"
            values={{ monitorName }}
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <p>
          <FormattedMessage
            id="xpack.uptime.monitorListDrawer.deleteModal.bodyContent"
            defaultMessage="You are about to delete {monitorName}. You won't be able to view any historical data."
            values={{ monitorName: <EuiCode>{monitorName}</EuiCode> }}
          />
        </p>
        <EuiSpacer />
        <p>
          <FormattedMessage
            id="xpack.uptime.monitorListDrawer.deleteModal.confirmationPrompt"
            defaultMessage="Are you sure you want to delete {monitorName}?"
            values={{ monitorName: <EuiCode>{monitorName}</EuiCode> }}
          />
        </p>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={closeModal}>
          <FormattedMessage
            id="xpack.uptime.monitorListDrawer.deleteModal.cancelText"
            defaultMessage="Don't delete"
            description="The context is: 'Don't delete it.'"
          />
        </EuiButtonEmpty>
        <EuiButton
          color="danger"
          fill
          onClick={() => {
            deleteMonitor();
            closeModal();
          }}
        >
          <FormattedMessage
            id="xpack.uptime.monitorListDrawer.deleteModal.confirmText"
            defaultMessage="Yes, delete monitor"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  </EuiOverlayMask>
);
