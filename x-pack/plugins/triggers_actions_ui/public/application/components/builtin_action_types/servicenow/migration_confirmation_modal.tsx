/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionConnectorFieldsProps } from '../../../../../public/types';
import { ServiceNowActionConnector } from './types';
import { Credentials } from './credentials';
import { isFieldInvalid } from './helpers';

const title = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.confirmationModalTitle',
  {
    defaultMessage: 'Migrate ServiceNow connector',
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
      'This action migrates the current connector to the new one. The action cannot be reversed.',
  }
);

interface Props {
  action: ActionConnectorFieldsProps<ServiceNowActionConnector>['action'];
  errors: ActionConnectorFieldsProps<ServiceNowActionConnector>['errors'];
  readOnly: boolean;
  isLoading: boolean;
  editActionSecrets: ActionConnectorFieldsProps<ServiceNowActionConnector>['editActionSecrets'];
  editActionConfig: ActionConnectorFieldsProps<ServiceNowActionConnector>['editActionConfig'];
  onCancel: () => void;
  onConfirm: () => void;
}

const MigrationConfirmationModalComponent: React.FC<Props> = ({
  action,
  errors,
  readOnly,
  isLoading,
  editActionSecrets,
  editActionConfig,
  onCancel,
  onConfirm,
}) => {
  const { apiUrl } = action.config;
  const { username, password } = action.secrets;

  const hasErrorsOrEmptyFields =
    apiUrl === undefined ||
    username === undefined ||
    password === undefined ||
    isFieldInvalid(apiUrl, errors.apiUrl) ||
    isFieldInvalid(username, errors.username) ||
    isFieldInvalid(password, errors.password);

  return (
    <EuiModal onClose={onCancel}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <h1>{title}</h1>
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup>
          <EuiFlexItem>{modalText}</EuiFlexItem>
        </EuiFlexGroup>
        <Credentials
          action={action}
          errors={errors}
          readOnly={readOnly}
          isLoading={isLoading}
          editActionSecrets={editActionSecrets}
          editActionConfig={editActionConfig}
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel}>{cancelButtonText}</EuiButtonEmpty>
        <EuiButton
          onClick={onConfirm}
          color="danger"
          fill
          disabled={hasErrorsOrEmptyFields}
          isLoading={isLoading}
        >
          {confirmButtonText}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

export const MigrationConfirmationModal = memo(MigrationConfirmationModalComponent);
