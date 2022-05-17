/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiFormRow, EuiFieldText, EuiFieldPassword, EuiTextArea } from '@elastic/eui';
import { getEncryptedFieldNotifyLabel } from '../../../get_encrypted_field_notify_label';
import type { ActionConnectorFieldsProps } from '../../../../../types';
import type { ServiceNowActionConnector } from '../types';
import * as i18n from '../translations';
import { isFieldInvalid } from '../helpers';
import { PRIVATE_KEY_PASSWORD_HELPER_TEXT } from '../translations';

interface Props {
  action: ActionConnectorFieldsProps<ServiceNowActionConnector>['action'];
  errors: ActionConnectorFieldsProps<ServiceNowActionConnector>['errors'];
  readOnly: boolean;
  isLoading: boolean;
  editActionSecrets: ActionConnectorFieldsProps<ServiceNowActionConnector>['editActionSecrets'];
  editActionConfig: ActionConnectorFieldsProps<ServiceNowActionConnector>['editActionConfig'];
}

const NUMBER_OF_FIELDS = 3;

const OAuthComponent: React.FC<Props> = ({
  action,
  errors,
  isLoading,
  readOnly,
  editActionSecrets,
  editActionConfig,
}) => {
  const { clientId, userIdentifierValue, jwtKeyId } = action.config;
  const { clientSecret, privateKey, privateKeyPassword } = action.secrets;

  const isClientIdInvalid = isFieldInvalid(clientId, errors.clientId);
  const isUserIdentifierInvalid = isFieldInvalid(userIdentifierValue, errors.userIdentifierValue);
  const isKeyIdInvalid = isFieldInvalid(jwtKeyId, errors.jwtKeyId);
  const isClientSecretInvalid = isFieldInvalid(clientSecret, errors.clientSecret);
  const isPrivateKeyInvalid = isFieldInvalid(privateKey, errors.privateKey);

  const onChangeClientIdEvent = useCallback(
    (event?: React.ChangeEvent<HTMLInputElement>) =>
      editActionConfig('clientId', event?.target.value ?? ''),
    [editActionConfig]
  );
  const onChangeUserIdentifierInvalidEvent = useCallback(
    (event?: React.ChangeEvent<HTMLInputElement>) =>
      editActionConfig('userIdentifierValue', event?.target.value ?? ''),
    [editActionConfig]
  );
  const onChangeJWTKeyIdEvent = useCallback(
    (event?: React.ChangeEvent<HTMLInputElement>) =>
      editActionConfig('jwtKeyId', event?.target.value ?? ''),
    [editActionConfig]
  );

  const onChangeClientSecretEvent = useCallback(
    (event?: React.ChangeEvent<HTMLInputElement>) =>
      editActionSecrets('clientSecret', event?.target.value ?? ''),
    [editActionSecrets]
  );

  const onChangePrivateKeyEvent = useCallback(
    (event?: React.ChangeEvent<HTMLTextAreaElement>) =>
      editActionSecrets('privateKey', event?.target.value ?? ''),
    [editActionSecrets]
  );

  const onChangePrivateKeyPasswordEvent = useCallback(
    (event?: React.ChangeEvent<HTMLInputElement>) =>
      editActionSecrets('privateKeyPassword', event?.target.value ?? ''),
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
        id="connector-servicenow-client-id"
        fullWidth
        error={errors.clientId}
        isInvalid={isClientIdInvalid}
        label={i18n.CLIENTID_LABEL}
      >
        <EuiFieldText
          fullWidth
          isInvalid={isClientIdInvalid}
          readOnly={readOnly}
          name="connector-servicenow-client-id"
          value={clientId || ''}
          data-test-subj="connector-servicenow-client-id-form-input"
          onChange={onChangeClientIdEvent}
          onBlur={() => {
            if (!clientId) {
              onChangeClientIdEvent();
            }
          }}
          disabled={isLoading}
        />
      </EuiFormRow>
      <EuiFormRow
        id="connector-servicenow-useremail"
        fullWidth
        error={errors.userEmail}
        isInvalid={isUserIdentifierInvalid}
        label={i18n.USER_EMAIL_LABEL}
      >
        <EuiFieldText
          fullWidth
          isInvalid={isUserIdentifierInvalid}
          readOnly={readOnly}
          name="connector-servicenow-user-identifier"
          value={userIdentifierValue || ''}
          data-test-subj="connector-servicenow-user-identifier-form-input"
          onChange={onChangeUserIdentifierInvalidEvent}
          onBlur={() => {
            if (!userIdentifierValue) {
              onChangeUserIdentifierInvalidEvent();
            }
          }}
          disabled={isLoading}
        />
      </EuiFormRow>
      <EuiFormRow
        id="connector-servicenow-keyid"
        fullWidth
        error={errors.keyId}
        isInvalid={isKeyIdInvalid}
        label={i18n.KEY_ID_LABEL}
      >
        <EuiFieldText
          fullWidth
          readOnly={readOnly}
          isInvalid={isKeyIdInvalid}
          name="connector-servicenow-jwt-key-id"
          value={jwtKeyId || ''}
          data-test-subj="connector-servicenow-jwt-key-id-form-input"
          onChange={onChangeJWTKeyIdEvent}
          onBlur={() => {
            if (!jwtKeyId) {
              onChangeJWTKeyIdEvent();
            }
          }}
          disabled={isLoading}
        />
      </EuiFormRow>
      <EuiFormRow
        id="connector-servicenow-client-secret"
        fullWidth
        error={errors.clientSecret}
        isInvalid={isClientSecretInvalid}
        label={i18n.CLIENTSECRET_LABEL}
      >
        <EuiFieldPassword
          fullWidth
          isInvalid={isClientSecretInvalid}
          readOnly={readOnly}
          name="connector-servicenow-client-secret"
          value={clientSecret || ''}
          data-test-subj="connector-servicenow-client-secret-form-input"
          onChange={onChangeClientSecretEvent}
          onBlur={() => {
            if (!clientSecret) {
              onChangeClientSecretEvent();
            }
          }}
          disabled={isLoading}
        />
      </EuiFormRow>
      <EuiFormRow
        id="connector-servicenow-private-key"
        fullWidth
        error={errors.privateKey}
        isInvalid={isPrivateKeyInvalid}
        label={i18n.PRIVATE_KEY_LABEL}
      >
        <EuiTextArea
          fullWidth
          readOnly={readOnly}
          isInvalid={isPrivateKeyInvalid}
          name="connector-servicenow-private-key"
          value={privateKey || ''}
          data-test-subj="connector-servicenow-private-key-form-input"
          onChange={onChangePrivateKeyEvent}
          onBlur={() => {
            if (!privateKey) {
              onChangePrivateKeyEvent();
            }
          }}
          disabled={isLoading}
        />
      </EuiFormRow>
      <EuiFormRow
        id="connector-servicenow-private-key-password"
        fullWidth
        error={errors.privateKeyPassword}
        label={i18n.PRIVATE_KEY_PASSWORD_LABEL}
        helpText={PRIVATE_KEY_PASSWORD_HELPER_TEXT}
      >
        <EuiFieldPassword
          fullWidth
          readOnly={readOnly}
          name="connector-servicenow-private-key-password"
          value={privateKeyPassword || ''}
          data-test-subj="connector-servicenow-private-key-password-form-input"
          onChange={onChangePrivateKeyPasswordEvent}
          onBlur={() => {
            if (!privateKeyPassword) {
              onChangePrivateKeyPasswordEvent();
            }
          }}
          disabled={isLoading}
        />
      </EuiFormRow>
    </>
  );
};

export const OAuth = memo(OAuthComponent);
