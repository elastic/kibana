/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiFieldText,
  EuiSpacer,
  EuiTitle,
  EuiFieldPassword,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { ActionConnectorFieldsProps } from '../../../../../public/types';
import { useKibana } from '../../../../common/lib/kibana';
import { getEncryptedFieldNotifyLabel } from '../../get_encrypted_field_notify_label';
import * as i18n from './translations';
import { ServiceNowActionConnector } from './types';
import { isFieldInvalid } from './helpers';

interface Props {
  action: ActionConnectorFieldsProps<ServiceNowActionConnector>['action'];
  errors: ActionConnectorFieldsProps<ServiceNowActionConnector>['errors'];
  readOnly: boolean;
  isLoading: boolean;
  editActionSecrets: ActionConnectorFieldsProps<ServiceNowActionConnector>['editActionSecrets'];
  editActionConfig: ActionConnectorFieldsProps<ServiceNowActionConnector>['editActionConfig'];
}

const CredentialsComponent: React.FC<Props> = ({
  action,
  errors,
  readOnly,
  isLoading,
  editActionSecrets,
  editActionConfig,
}) => {
  const { docLinks } = useKibana().services;
  const { apiUrl } = action.config;
  const { username, password } = action.secrets;

  const isApiUrlInvalid = isFieldInvalid(apiUrl, errors.apiUrl);
  const isUsernameInvalid = isFieldInvalid(username, errors.username);
  const isPasswordInvalid = isFieldInvalid(password, errors.password);

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
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>{i18n.SN_INSTANCE_LABEL}</h4>
          </EuiTitle>
          <p>
            <FormattedMessage
              id="xpack.triggersActionsUI.components.builtinActionTypes.serviceNowAction.apiUrlHelpLabel"
              defaultMessage="Please provide the full URL to the desired ServiceNow instance. If you do not have one, you can {instance}"
              values={{
                instance: (
                  <EuiLink href={docLinks.links.alerting.serviceNowAction} target="_blank">
                    {i18n.SETUP_DEV_INSTANCE}
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id="apiUrl"
            fullWidth
            error={errors.apiUrl}
            isInvalid={isApiUrlInvalid}
            label={i18n.API_URL_LABEL}
            helpText={i18n.API_URL_HELPTEXT}
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
              disabled={isLoading}
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
              disabled={isLoading}
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
              disabled={isLoading}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

export const Credentials = memo(CredentialsComponent);
