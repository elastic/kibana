/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldPassword,
  EuiSpacer,
} from '@elastic/eui';

import * as i18n from './translations';
import { ConnectorFlyoutFormProps } from '../types';
import { JiraActionConnector } from './types';
import { withConnectorFlyout } from '../components/connector_flyout';

const JiraConnectorForm: React.FC<ConnectorFlyoutFormProps<JiraActionConnector>> = ({
  errors,
  action,
  onChangeSecret,
  onBlurSecret,
  onChangeConfig,
  onBlurConfig,
}) => {
  const { projectKey } = action.config;
  const { email, apiToken } = action.secrets;
  const isProjectKeyInvalid: boolean = errors.projectKey.length > 0 && projectKey != null;
  const isEmailInvalid: boolean = errors.email.length > 0 && email != null;
  const isApiTokenInvalid: boolean = errors.apiToken.length > 0 && apiToken != null;

  return (
    <>
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
              onChange={(evt) => onChangeConfig('projectKey', evt.target.value)}
              onBlur={() => onBlurConfig('projectKey')}
            />
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
              name="connector-jira-email"
              value={email || ''} // Needed to prevent uncontrolled input error when value is undefined
              data-test-subj="connector-jira-email-form-input"
              onChange={(evt) => onChangeSecret('email', evt.target.value)}
              onBlur={() => onBlurSecret('email')}
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
              isInvalid={isApiTokenInvalid}
              name="connector-jira-apiToken"
              value={apiToken || ''} // Needed to prevent uncontrolled input error when value is undefined
              data-test-subj="connector-jira-apiToken-form-input"
              onChange={(evt) => onChangeSecret('apiToken', evt.target.value)}
              onBlur={() => onBlurSecret('apiToken')}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

export const JiraConnectorFlyout = withConnectorFlyout<JiraActionConnector>({
  ConnectorFormComponent: JiraConnectorForm,
  secretKeys: ['email', 'apiToken'],
  configKeys: ['projectKey'],
  connectorActionTypeId: '.jira',
});

// eslint-disable-next-line import/no-default-export
export { JiraConnectorFlyout as default };
