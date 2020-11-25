/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { isEmpty } from 'lodash';
import { ActionConnectorFieldsProps } from '../../../../types';
import { CasesConfigurationMapping, FieldMapping, createDefaultMapping } from '../case_mappings';

import * as i18n from './translations';
import { JiraActionConnector } from './types';
import { connectorConfiguration } from './config';

const JiraConnectorFields: React.FC<ActionConnectorFieldsProps<JiraActionConnector>> = ({
  action,
  editActionSecrets,
  editActionConfig,
  errors,
  consumer,
  readOnly,
  docLinks,
}) => {
  // TODO: remove incidentConfiguration later, when Case Jira will move their fields to the level of action execution
  const { apiUrl, projectKey, incidentConfiguration, isCaseOwned } = action.config;
  const mapping = incidentConfiguration ? incidentConfiguration.mapping : [];

  const isApiUrlInvalid: boolean = errors.apiUrl.length > 0 && apiUrl != null;

  const { email, apiToken } = action.secrets;

  const isProjectKeyInvalid: boolean = errors.projectKey.length > 0 && projectKey != null;
  const isEmailInvalid: boolean = errors.email.length > 0 && email != null;
  const isApiTokenInvalid: boolean = errors.apiToken.length > 0 && apiToken != null;

  // TODO: remove this block later, when Case ServiceNow will move their fields to the level of action execution
  if (consumer === 'case') {
    if (isEmpty(mapping)) {
      editActionConfig('incidentConfiguration', {
        mapping: createDefaultMapping(connectorConfiguration.fields as any),
      });
    }
    if (!isCaseOwned) {
      editActionConfig('isCaseOwned', true);
    }
  }

  const handleOnChangeActionConfig = useCallback(
    (key: string, value: string) => editActionConfig(key, value),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleOnChangeSecretConfig = useCallback(
    (key: string, value: string) => editActionSecrets(key, value),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleOnChangeMappingConfig = useCallback(
    (newMapping: CasesConfigurationMapping[]) =>
      editActionConfig('incidentConfiguration', {
        ...action.config.incidentConfiguration,
        mapping: newMapping,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [action.config]
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
              onBlur={() => {
                if (!projectKey) {
                  editActionConfig('projectKey', '');
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
            <h4>{i18n.JIRA_AUTHENTICATION_LABEL}</h4>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow fullWidth>{getEncryptedFieldNotifyLabel(!action.id)}</EuiFormRow>
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
              onBlur={() => {
                if (!email) {
                  editActionSecrets('email', '');
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
              onBlur={() => {
                if (!apiToken) {
                  editActionSecrets('apiToken', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      {consumer === 'case' && ( // TODO: remove this block later, when Case Jira will move their fields to the level of action execution
        <>
          <EuiSpacer size="l" />
          <EuiFlexGroup>
            <EuiFlexItem data-test-subj="case-jira-mappings">
              <FieldMapping
                disabled={true}
                connectorConfiguration={connectorConfiguration}
                mapping={mapping as CasesConfigurationMapping[]}
                onChangeMapping={handleOnChangeMappingConfig}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};

function getEncryptedFieldNotifyLabel(isCreate: boolean) {
  if (isCreate) {
    return (
      <EuiText size="s" data-test-subj="rememberValuesMessage">
        {i18n.JIRA_REMEMBER_VALUES_LABEL}
      </EuiText>
    );
  }
  return (
    <EuiCallOut
      size="s"
      iconType="iInCircle"
      title={i18n.JIRA_REENTER_VALUES_LABEL}
      data-test-subj="reenterValuesMessage"
    />
  );
}

// eslint-disable-next-line import/no-default-export
export { JiraConnectorFields as default };
