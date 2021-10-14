/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiFormRow, EuiFieldText, EuiFieldPassword } from '@elastic/eui';
import type { ActionConnectorFieldsProps } from '../../../../types';
import * as i18n from './translations';
import type { ServiceNowActionConnector } from './types';
import { isFieldInvalid } from './helpers';
import { getEncryptedFieldNotifyLabel } from '../../get_encrypted_field_notify_label';

interface Props {
  action: ActionConnectorFieldsProps<ServiceNowActionConnector>['action'];
  errors: ActionConnectorFieldsProps<ServiceNowActionConnector>['errors'];
  readOnly: boolean;
  isLoading: boolean;
  editActionSecrets: ActionConnectorFieldsProps<ServiceNowActionConnector>['editActionSecrets'];
}

const NUMBER_OF_FIELDS = 2;

const CredentialsAuthComponent: React.FC<Props> = ({
  action,
  errors,
  isLoading,
  readOnly,
  editActionSecrets,
}) => {
  const { username, password } = action.secrets;

  const isUsernameInvalid = isFieldInvalid(username, errors.username);
  const isPasswordInvalid = isFieldInvalid(password, errors.password);

  const onChangeUsernameEvent = useCallback(
    (event?: React.ChangeEvent<HTMLInputElement>) =>
      editActionSecrets('username', event?.target.value ?? ''),
    [editActionSecrets]
  );

  const onChangePasswordEvent = useCallback(
    (event?: React.ChangeEvent<HTMLInputElement>) =>
      editActionSecrets('password', event?.target.value ?? ''),
    [editActionSecrets]
  );

  return (
    <>
      <EuiFormRow fullWidth>
        {getEncryptedFieldNotifyLabel(
          !action.id,
          NUMBER_OF_FIELDS,
          action.isMissingSecrets ?? false,
          i18n.REENTER_VALUES_LABEL
        )}
      </EuiFormRow>
      <EuiFormRow
        id="connector-servicenow-username"
        fullWidth
        error={errors.username}
        isInvalid={isUsernameInvalid}
        label={i18n.USERNAME_LABEL}
      >
        <EuiFieldText
          fullWidth
          isInvalid={isUsernameInvalid}
          readOnly={readOnly}
          name="connector-servicenow-username"
          value={username || ''} // Needed to prevent uncontrolled input error when value is undefined
          data-test-subj="connector-servicenow-username-form-input"
          onChange={onChangeUsernameEvent}
          onBlur={() => {
            if (!username) {
              onChangeUsernameEvent();
            }
          }}
          disabled={isLoading}
        />
      </EuiFormRow>
      <EuiFormRow
        id="connector-servicenow-password"
        fullWidth
        error={errors.password}
        isInvalid={isPasswordInvalid}
        label={i18n.PASSWORD_LABEL}
      >
        <EuiFieldPassword
          fullWidth
          readOnly={readOnly}
          isInvalid={isPasswordInvalid}
          name="connector-servicenow-password"
          value={password || ''} // Needed to prevent uncontrolled input error when value is undefined
          data-test-subj="connector-servicenow-password-form-input"
          onChange={onChangePasswordEvent}
          onBlur={() => {
            if (!password) {
              onChangePasswordEvent();
            }
          }}
          disabled={isLoading}
        />
      </EuiFormRow>
    </>
  );
};

export const CredentialsAuth = memo(CredentialsAuthComponent);
