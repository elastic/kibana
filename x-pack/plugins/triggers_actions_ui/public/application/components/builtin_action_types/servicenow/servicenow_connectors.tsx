/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldPassword,
  EuiSpacer,
  EuiLink,
  EuiTitle,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { ActionConnectorFieldsProps } from '../../../../types';

import * as i18n from './translations';
import { ServiceNowActionConnector } from './types';
import { useKibana } from '../../../../common/lib/kibana';
import { getEncryptedFieldNotifyLabel } from '../../get_encrypted_field_notify_label';

const ServiceNowConnectorFields: React.FC<ActionConnectorFieldsProps<ServiceNowActionConnector>> =
  ({ action, editActionSecrets, editActionConfig, errors, consumer, readOnly }) => {
    const { docLinks } = useKibana().services;
    const { apiUrl } = action.config;

    const isApiUrlInvalid: boolean =
      errors.apiUrl !== undefined && errors.apiUrl.length > 0 && apiUrl !== undefined;

    const { username, password } = action.secrets;

    const isUsernameInvalid: boolean =
      errors.username !== undefined && errors.username.length > 0 && username !== undefined;
    const isPasswordInvalid: boolean =
      errors.password !== undefined && errors.password.length > 0 && password !== undefined;

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
        <EuiSpacer size="m" />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow fullWidth>
              {getEncryptedFieldNotifyLabel(
                !action.id,
                2,
                action.isMissingSecrets ?? false,
                i18n.REENTER_VALUES_LABEL
              )}
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
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
    );
  };

// eslint-disable-next-line import/no-default-export
export { ServiceNowConnectorFields as default };
