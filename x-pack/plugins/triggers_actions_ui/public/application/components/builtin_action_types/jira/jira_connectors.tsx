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
  EuiTitle,
} from '@elastic/eui';

import { ActionConnectorFieldsProps } from '../../../../types';

import * as i18n from './translations';
import { JiraActionConnector } from './types';
import { getEncryptedFieldNotifyLabel } from '../../get_encrypted_field_notify_label';

const JiraConnectorFields: React.FC<ActionConnectorFieldsProps<JiraActionConnector>> = ({
  action,
  editActionSecrets,
  editActionConfig,
  errors,
  readOnly,
}) => {
  const { apiUrl, projectKey } = action.config;

  const isApiUrlInvalid: boolean =
    apiUrl !== undefined && errors.apiUrl !== undefined && errors.apiUrl.length > 0;

  const { email, apiToken } = action.secrets;

  const isProjectKeyInvalid: boolean =
    projectKey !== undefined && errors.projectKey !== undefined && errors.projectKey.length > 0;
  const isEmailInvalid: boolean =
    email !== undefined && errors.email !== undefined && errors.email.length > 0;
  const isApiTokenInvalid: boolean =
    apiToken !== undefined && errors.apiToken !== undefined && errors.apiToken.length > 0;

  const handleOnChangeActionConfig = useCallback(
    (key: string, value: string) => editActionConfig(key, value),
    [editActionConfig]
  );

  const handleOnChangeSecretConfig = useCallback(
    (key: string, value: string) => editActionSecrets(key, value),
    [editActionSecrets]
  );

  const handleResetField = useCallback(
    (checkValue, fieldName: string, actionField: 'config' | 'secrets') => {
      if (!checkValue) {
        if (actionField === 'config') {
          handleOnChangeActionConfig(fieldName, '');
        } else {
          handleOnChangeSecretConfig(fieldName, '');
        }
      }
    },
    [handleOnChangeActionConfig, handleOnChangeSecretConfig]
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
          >
            <EuiFieldText
              fullWidth
              isInvalid={isApiUrlInvalid}
              name="apiUrl"
              readOnly={readOnly}
              value={apiUrl || ''} // Needed to prevent uncontrolled input error when value is undefined
              data-test-subj="apiUrlFromInput"
              onChange={(evt) => handleOnChangeActionConfig('apiUrl', evt.target.value)}
              onBlur={() => handleResetField(apiUrl, 'apiUrl', 'config')}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="connector-jira-project-key"
            fullWidth
            error={errors.projectKey}
            isInvalid={isProjectKeyInvalid}
            label={i18n.JIRA_PROJECT_KEY_LABEL}
          >
            <EuiFieldText
              fullWidth
              isInvalid={isProjectKeyInvalid}
              name="connector-jira-project-key"
              value={projectKey || ''} // Needed to prevent uncontrolled input error when value is undefined
              data-test-subj="connector-jira-project-key-form-input"
              onChange={(evt) => handleOnChangeActionConfig('projectKey', evt.target.value)}
              onBlur={() => handleResetField(projectKey, 'projectKey', 'config')}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>{i18n.JIRA_AUTHENTICATION_LABEL}</h4>
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
              i18n.JIRA_REENTER_VALUES_LABEL
            )}
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="connector-jira-email"
            fullWidth
            error={errors.email}
            isInvalid={isEmailInvalid}
            label={i18n.JIRA_EMAIL_LABEL}
          >
            <EuiFieldText
              fullWidth
              isInvalid={isEmailInvalid}
              readOnly={readOnly}
              name="connector-jira-email"
              value={email || ''} // Needed to prevent uncontrolled input error when value is undefined
              data-test-subj="connector-jira-email-form-input"
              onChange={(evt) => handleOnChangeSecretConfig('email', evt.target.value)}
              onBlur={() => handleResetField(email, 'email', 'secrets')}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="connector-jira-apiToken"
            fullWidth
            error={errors.apiToken}
            isInvalid={isApiTokenInvalid}
            label={i18n.JIRA_API_TOKEN_LABEL}
          >
            <EuiFieldPassword
              fullWidth
              readOnly={readOnly}
              isInvalid={isApiTokenInvalid}
              name="connector-jira-apiToken"
              value={apiToken || ''} // Needed to prevent uncontrolled input error when value is undefined
              data-test-subj="connector-jira-apiToken-form-input"
              onChange={(evt) => handleOnChangeSecretConfig('apiToken', evt.target.value)}
              onBlur={() => handleResetField(apiToken, 'apiToken', 'secrets')}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { JiraConnectorFields as default };
