/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiConfirmModal, EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const title = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.confirmationModalTitle',
  {
    defaultMessage: 'ServiceNow connector migration',
  }
);

const cancelButtonText = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.cancelButtonText',
  {
    defaultMessage: 'Do not migrate',
  }
);

const confirmButtonText = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.confirmButtonText',
  {
    defaultMessage: 'Migrate',
  }
);

const modalText = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.modalText',
  {
    defaultMessage:
      'You are about to migrate to the new connector. This action cannot be reversed.',
  }
);

const modalErrorMessage = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.modalErrorMessage',
  {
    defaultMessage: 'Invalid configuration or secrets',
  }
);

interface Props {
  hasErrors?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const MigrationConfirmationModalComponent: React.FC<Props> = ({
  onCancel,
  onConfirm,
  hasErrors = true,
}) => {
  return (
    <EuiConfirmModal
      title={title}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={cancelButtonText}
      confirmButtonText={confirmButtonText}
      buttonColor="danger"
      defaultFocusedButton="confirm"
      confirmButtonDisabled={hasErrors}
    >
      <p>{modalText}</p>
      <p>{hasErrors && <EuiTextColor color="danger">{modalErrorMessage}</EuiTextColor>}</p>
    </EuiConfirmModal>
  );
};

export const MigrationConfirmationModal = memo(MigrationConfirmationModalComponent);
