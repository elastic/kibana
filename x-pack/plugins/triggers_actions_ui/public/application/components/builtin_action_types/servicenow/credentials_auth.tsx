/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import {
  EuiFormRow,
  EuiFieldText,
  EuiFieldPassword,
  EuiSwitch,
  EuiTextArea,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
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
  editActionConfig: ActionConnectorFieldsProps<ServiceNowActionConnector>['editActionConfig'];
}

const NUMBER_OF_FIELDS = 2;

const CredentialsAuthComponent: React.FC<Props> = ({
  action,
  errors,
  isLoading,
  readOnly,
  editActionSecrets,
  editActionConfig,
}) => {
  const { isOAuth, clientId, userIdentifierValue, jwtKeyId } = action.config;
  const { username, password, clientSecret, privateKey, privateKeyPassword } = action.secrets;

  const isUsernameInvalid = isFieldInvalid(username, errors.username);
  const isPasswordInvalid = isFieldInvalid(password, errors.password);
  const isClientIdInvalid: boolean = errors.clientId.length > 0 && clientId !== undefined;
  const isUserIdentifierInvalid: boolean =
    errors.userIdentifierValue.length > 0 && userIdentifierValue !== undefined;
  const isKeyIdInvalid: boolean = errors.jwtKeyId.length > 0 && jwtKeyId !== undefined;
  const isClientSecretInvalid: boolean =
    errors.clientSecret.length > 0 && clientSecret !== undefined;
  const isPrivateKeyInvalid: boolean = errors.privateKey.length > 0 && privateKey !== undefined;
  const isPrivateKeyPasswordInvalid: boolean =
    errors.privateKeyPassword.length > 0 && privateKeyPassword !== undefined;

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

  const onChangeClientIdEvent = useCallback(
    (event?: React.ChangeEvent<HTMLInputElement>) =>
      editActionConfig('clientId', event?.target.value ?? ''),
    [editActionConfig]
  );

  return (
    <>
      <EuiSwitch
        label={i18n.IS_OAUTH}
        disabled={readOnly}
        checked={isOAuth || false}
        onChange={(e) => {
          editActionConfig('isOAuth', e.target.checked);
          if (!e.target.checked) {
            editActionConfig('clientId', null);
            editActionConfig('userEmail', null);
            editActionConfig('keyId', null);
            editActionSecrets('clientSecret', null);
            editActionSecrets('privateKey', null);
            editActionSecrets('privateKeyPassword', null);
          } else {
            editActionSecrets('username', null);
            editActionSecrets('password', null);
          }
        }}
      />
      <EuiFormRow fullWidth>
        {getEncryptedFieldNotifyLabel(
          !action.id,
          NUMBER_OF_FIELDS,
          action.isMissingSecrets ?? false,
          i18n.REENTER_VALUES_LABEL
        )}
      </EuiFormRow>
      {isOAuth ? (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup>
            <EuiFlexItem>
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
                  data-test-subj="connector-servicenow-clientid-form-input"
                  onChange={onChangeClientIdEvent}
                  onBlur={() => {
                    if (!clientId) {
                      onChangeClientIdEvent();
                    }
                  }}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiFlexGroup>
            <EuiFlexItem>
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
                  data-test-subj="connector-servicenow-clientsecret-form-input"
                  onChange={onChangeClientSecretEvent}
                  onBlur={() => {
                    if (!clientSecret) {
                      onChangeClientSecretEvent();
                    }
                  }}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiFlexGroup>
            <EuiFlexItem>
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
                  value={userIdentifierValue || ''} // Needed to prevent uncontrolled input error when value is undefined
                  data-test-subj="connector-servicenow-user-identifier-form-input"
                  onChange={onChangeUserIdentifierInvalidEvent}
                  onBlur={() => {
                    if (!userIdentifierValue) {
                      onChangeUserIdentifierInvalidEvent();
                    }
                  }}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiFlexGroup>
            <EuiFlexItem>
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
                  name="connector-servicenow-keyid"
                  value={jwtKeyId || ''} // Needed to prevent uncontrolled input error when value is undefined
                  data-test-subj="connector-servicenow-keyid-form-input"
                  onChange={onChangeJWTKeyIdEvent}
                  onBlur={() => {
                    if (!jwtKeyId) {
                      onChangeJWTKeyIdEvent();
                    }
                  }}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow
                id="connector-servicenow-keyid"
                fullWidth
                error={errors.privateKey}
                isInvalid={isPrivateKeyInvalid}
                label={i18n.PRIVATE_KEY_LABEL}
              >
                <EuiTextArea
                  fullWidth
                  readOnly={readOnly}
                  isInvalid={isPrivateKeyInvalid}
                  name="connector-servicenow-public-certificate"
                  value={privateKey || ''} // Needed to prevent uncontrolled input error when value is undefined
                  data-test-subj="connector-servicenow-public-certificate-form-input"
                  onChange={onChangePrivateKeyEvent}
                  onBlur={() => {
                    if (!privateKey) {
                      onChangePrivateKeyEvent();
                    }
                  }}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow
                id="connector-servicenow-private-key-password"
                fullWidth
                error={errors.privateKeyPassword}
                isInvalid={isPrivateKeyPasswordInvalid}
                label={i18n.PRIVATE_KEY_PASSWORD_LABEL}
              >
                <EuiFieldPassword
                  fullWidth
                  isInvalid={isPrivateKeyPasswordInvalid}
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
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup>
            <EuiFlexItem>
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
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiFlexGroup>
            <EuiFlexItem>
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
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};

export const CredentialsAuth = memo(CredentialsAuthComponent);
