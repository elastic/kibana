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
} from '@elastic/eui';

import { isEmpty } from 'lodash';

// TODO: remove FieldMapping, createDefaultMapping later
// when Case ServiceNow will move their fields to the level of action execution
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { FieldMapping } from '../../../../../../security_solution/public/cases/components/configure_cases/field_mapping';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { createDefaultMapping } from '../../../../../../security_solution/public/common/lib/connectors/utils';

import { IErrorObject, ActionConnectorFieldsProps } from '../../../../types';
import * as i18n from './translations';
import { ServiceNowActionConnector, CasesConfigurationMapping } from './types';
import { connectorConfiguration } from './config';

export interface ConnectorFlyoutFormProps<T> {
  errors: IErrorObject;
  action: T;
  onChangeSecret: (key: string, value: string) => void;
  onBlurSecret: (key: string) => void;
  onChangeConfig: (key: string, value: string) => void;
  onBlurConfig: (key: string) => void;
}

const ServiceNowConnectorFlyout: React.FC<ActionConnectorFieldsProps<
  ServiceNowActionConnector
>> = ({ action, editActionSecrets, editActionConfig, errors }) => {
  // TODO: remove incidentConfiguration later, when Case ServiceNow will move their fields to the level of action execution
  const { apiUrl, incidentConfiguration } = action.config;
  const mapping = incidentConfiguration ? incidentConfiguration.mapping : [];

  const isApiUrlInvalid: boolean = errors.apiUrl.length > 0 && apiUrl != null;

  const { username, password } = action.secrets;

  const isUsernameInvalid: boolean = errors.username.length > 0 && username != null;
  const isPasswordInvalid: boolean = errors.password.length > 0 && password != null;

  // TODO: remove this block later, when Case ServiceNow will move their fields to the level of action execution
  if (action.consumer === 'case' && isEmpty(mapping)) {
    editActionConfig('incidentConfiguration', {
      mapping: createDefaultMapping(connectorConfiguration.fields as any),
    });
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
              value={apiUrl || ''} // Needed to prevent uncontrolled input error when value is undefined
              data-test-subj="apiUrlFromInput"
              placeholder="https://<site-url>"
              onChange={(evt) => handleOnChangeActionConfig('apiUrl', evt.target.value)}
              onBlur={() => {
                if (!apiUrl) {
                  editActionSecrets('apiUrl', '');
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
      {incidentConfiguration && ( // TODO: remove this block later, when Case ServiceNow will move their fields to the level of action execution
        <>
          <EuiSpacer size="l" />
          <EuiFlexGroup>
            <EuiFlexItem>
              <FieldMapping
                disabled={true}
                connectorActionTypeId={connectorConfiguration.id}
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
export { ServiceNowConnectorFlyout as default };
