/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
} from '@elastic/eui';

import { isEmpty } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';
import { ActionConnectorFieldsProps } from '../../../../types';
import { CasesConfigurationMapping, FieldMapping, createDefaultMapping } from '../case_mappings';

import * as i18n from './translations';
import { ServiceNowActionConnector } from './types';
import { connectorConfiguration } from './config';

const ServiceNowConnectorFields: React.FC<ActionConnectorFieldsProps<
  ServiceNowActionConnector
>> = ({ action, editActionSecrets, editActionConfig, errors, consumer, readOnly, docLinks }) => {
  // TODO: remove incidentConfiguration later, when Case ServiceNow will move their fields to the level of action execution
  const { apiUrl, incidentConfiguration, isCaseOwned } = action.config;
  const mapping = incidentConfiguration ? incidentConfiguration.mapping : [];

  const isApiUrlInvalid: boolean = errors.apiUrl.length > 0 && apiUrl != null;

  const { username, password } = action.secrets;

  const isUsernameInvalid: boolean = errors.username.length > 0 && username != null;
  const isPasswordInvalid: boolean = errors.password.length > 0 && password != null;

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
            helpText={
              <EuiLink
                href={`${docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${docLinks.DOC_LINK_VERSION}/servicenow-action-type.html#configuring-servicenow`}
                target="_blank"
              >
                <FormattedMessage
                  id="xpack.triggersActionsUI.components.builtinActionTypes.serviceNowAction.apiUrlHelpLabel"
                  defaultMessage="Configure Personal Developer Instance for ServiceNow"
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
              placeholder="https://<site-url>"
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
      {consumer === 'case' && ( // TODO: remove this block later, when Case ServiceNow will move their fields to the level of action execution
        <>
          <EuiSpacer size="l" />
          <EuiFlexGroup>
            <EuiFlexItem data-test-subj="case-servicenow-mappings">
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

// eslint-disable-next-line import/no-default-export
export { ServiceNowConnectorFields as default };
