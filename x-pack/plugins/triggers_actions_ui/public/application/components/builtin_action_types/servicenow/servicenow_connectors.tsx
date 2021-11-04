/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import {
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldPassword,
  EuiSpacer,
  EuiLink,
  EuiText,
  EuiTitle,
  EuiSwitch,
  EuiTextArea,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { ActionConnectorFieldsProps } from '../../../../types';

import * as i18n from './translations';
import { ServiceNowActionConnector } from './types';
import { useKibana } from '../../../../common/lib/kibana';

const ServiceNowConnectorFields: React.FC<
  ActionConnectorFieldsProps<ServiceNowActionConnector>
> = ({ action, editActionSecrets, editActionConfig, errors, readOnly }) => {
  const { docLinks } = useKibana().services;
  const { apiUrl, isOAuth, clientId, userEmail, keyId } = action.config;

  const isApiUrlInvalid: boolean = errors.apiUrl.length > 0 && apiUrl !== undefined;

  const { username, password, clientSecret, privateKey, privateKeyPassword } = action.secrets;

  const isUsernameInvalid: boolean = errors.username.length > 0 && username !== undefined;
  const isPasswordInvalid: boolean = errors.password.length > 0 && password !== undefined;
  const isClientIdInvalid: boolean = errors.clientId.length > 0 && clientId !== undefined;
  const isUserEmailInvalid: boolean = errors.userEmail.length > 0 && userEmail !== undefined;
  const isKeyIdInvalid: boolean = errors.keyId.length > 0 && keyId !== undefined;
  const isClientSecretInvalid: boolean =
    errors.clientSecret.length > 0 && clientSecret !== undefined;
  const isPrivateKeyInvalid: boolean = errors.privateKey.length > 0 && privateKey !== undefined;
  const isPrivateKeyPasswordInvalid: boolean =
    errors.privateKeyPassword.length > 0 && privateKeyPassword !== undefined;

  const handleOnChangeActionConfig = useCallback(
    (key: string, value: string) => editActionConfig(key, value),
    [editActionConfig]
  );

  const handleOnChangeSecretConfig = useCallback(
    (key: string, value: string) => editActionSecrets(key, value),
    [editActionSecrets]
  );
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="apiUrl"
            fullWidth
            error={errors.apiUrl}
            isInvalid={isApiUrlInvalid}
            label={i18n.API_URL_LABEL}
            helpText={
              <EuiLink href={docLinks.links.alerting.serviceNowAction} target="_blank">
                <FormattedMessage
                  id="xpack.triggersActionsUI.components.builtinActionTypes.serviceNowAction.apiUrlHelpLabel"
                  defaultMessage="Configure a Personal Developer Instance"
                />
              </EuiLink>
            }
          >
            <EuiFieldText
              fullWidth
              isInvalid={isApiUrlInvalid}
              name="apiUrl"
              readOnly={readOnly}
              value={apiUrl || ''} // Needed to prevent uncontrolled input error when value is undefined
              data-test-subj="apiUrlFromInput"
              onChange={(evt) => handleOnChangeActionConfig('apiUrl', evt.target.value)}
              onBlur={() => {
                if (!apiUrl) {
                  editActionConfig('apiUrl', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>{i18n.AUTHENTICATION_LABEL}</h4>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
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
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow fullWidth>{getEncryptedFieldNotifyLabel(!action.id, isOAuth)}</EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
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
                  onChange={(evt) => handleOnChangeActionConfig('clientId', evt.target.value)}
                  onBlur={() => {
                    if (!clientId) {
                      editActionConfig('clientId', '');
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
                  onChange={(evt) => handleOnChangeSecretConfig('clientSecret', evt.target.value)}
                  onBlur={() => {
                    if (!clientSecret) {
                      editActionSecrets('clientSecret', '');
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
                isInvalid={isUserEmailInvalid}
                label={i18n.USER_EMAIL_LABEL}
              >
                <EuiFieldText
                  fullWidth
                  isInvalid={isUserEmailInvalid}
                  readOnly={readOnly}
                  name="connector-servicenow-useremail"
                  value={userEmail || ''} // Needed to prevent uncontrolled input error when value is undefined
                  data-test-subj="connector-servicenow-useremail-form-input"
                  onChange={(evt) => handleOnChangeActionConfig('userEmail', evt.target.value)}
                  onBlur={() => {
                    if (!userEmail) {
                      editActionConfig('userEmail', '');
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
                  value={keyId || ''} // Needed to prevent uncontrolled input error when value is undefined
                  data-test-subj="connector-servicenow-keyid-form-input"
                  onChange={(evt) => handleOnChangeActionConfig('keyId', evt.target.value)}
                  onBlur={() => {
                    if (!keyId) {
                      editActionConfig('keyId', '');
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
                  onChange={(evt) => handleOnChangeSecretConfig('privateKey', evt.target.value)}
                  onBlur={() => {
                    if (!privateKey) {
                      editActionSecrets('privateKey', '');
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
                  onChange={(evt) =>
                    handleOnChangeSecretConfig('privateKeyPassword', evt.target.value)
                  }
                  onBlur={() => {
                    if (!privateKeyPassword) {
                      editActionSecrets('privateKeyPassword', '');
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
                  onChange={(evt) => handleOnChangeSecretConfig('username', evt.target.value)}
                  onBlur={() => {
                    if (!username) {
                      editActionSecrets('username', '');
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
                  onChange={(evt) => handleOnChangeSecretConfig('password', evt.target.value)}
                  onBlur={() => {
                    if (!password) {
                      editActionSecrets('password', '');
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

function getEncryptedFieldNotifyLabel(isCreate: boolean, isOAuth: boolean) {
  if (isCreate) {
    return (
      <EuiText size="s" data-test-subj="rememberValuesMessage">
        {i18n.REMEMBER_VALUES_LABEL}
      </EuiText>
    );
  }
  return (
    <EuiCallOut
      size="s"
      iconType="iInCircle"
      title={isOAuth ? i18n.REENTER_OAUTH_VALUES_LABEL : i18n.REENTER_VALUES_LABEL}
      data-test-subj="reenterValuesMessage"
    />
  );
}

// eslint-disable-next-line import/no-default-export
export { ServiceNowConnectorFields as default };
