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
  EuiCallOut,
  EuiTextColor,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionConnectorFieldsProps } from '../../../../../public/types';
import { ServiceNowActionConnector } from './types';
import { Credentials } from './credentials';
import { isFieldInvalid } from './helpers';
import { ApplicationRequiredCallout } from './application_required_callout';

const title = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.confirmationModalTitle',
  {
    defaultMessage: 'Update ServiceNow connector',
  }
);

const cancelButtonText = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.cancelButtonText',
  {
    defaultMessage: 'Cancel',
  }
);

const confirmButtonText = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.confirmButtonText',
  {
    defaultMessage: 'Update',
  }
);

const calloutTitle = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.modalCalloutTitle',
  {
    defaultMessage:
      'The Elastic App from the ServiceNow App Store must be installed prior to running the update.',
  }
);

const warningMessage = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.modalWarningMessage',
  {
    defaultMessage: 'This will update all instances of this connector.  This can not be reversed.',
  }
);

interface Props {
  action: ActionConnectorFieldsProps<ServiceNowActionConnector>['action'];
  applicationInfoErrorMsg: string | null;
  errors: ActionConnectorFieldsProps<ServiceNowActionConnector>['errors'];
  isLoading: boolean;
  readOnly: boolean;
  editActionSecrets: ActionConnectorFieldsProps<ServiceNowActionConnector>['editActionSecrets'];
  editActionConfig: ActionConnectorFieldsProps<ServiceNowActionConnector>['editActionConfig'];
  onCancel: () => void;
  onConfirm: () => void;
}

const UpdateConnectorModalComponent: React.FC<Props> = ({
  action,
  applicationInfoErrorMsg,
  errors,
  isLoading,
  readOnly,
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
          <EuiFlexItem>
            <EuiCallOut
              size="m"
              iconType="alert"
              data-test-subj="snModalInstallationCallout"
              title={calloutTitle}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <Credentials
          action={action}
          errors={errors}
          readOnly={readOnly}
          isLoading={isLoading}
          editActionSecrets={editActionSecrets}
          editActionConfig={editActionConfig}
        />
        <EuiHorizontalRule />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTextColor color="danger">{warningMessage}</EuiTextColor>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup>
          <EuiFlexItem>
            {applicationInfoErrorMsg && (
              <ApplicationRequiredCallout message={applicationInfoErrorMsg} />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
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

export const UpdateConnectorModal = memo(UpdateConnectorModalComponent);
