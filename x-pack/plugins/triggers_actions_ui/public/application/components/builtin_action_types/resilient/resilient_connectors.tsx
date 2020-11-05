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
import * as i18n from './translations';
import { ResilientActionConnector } from './types';
import { connectorConfiguration } from './config';
import { FieldMapping, CasesConfigurationMapping, createDefaultMapping } from '../case_mappings';

const ResilientConnectorFields: React.FC<ActionConnectorFieldsProps<ResilientActionConnector>> = ({
  action,
  editActionSecrets,
  editActionConfig,
  errors,
  consumer,
  readOnly,
  docLinks,
}) => {
  // TODO: remove incidentConfiguration later, when Case Resilient will move their fields to the level of action execution
  const { apiUrl, orgId, incidentConfiguration, isCaseOwned } = action.config;
  const mapping = incidentConfiguration ? incidentConfiguration.mapping : [];

  const isApiUrlInvalid: boolean = errors.apiUrl.length > 0 && apiUrl != null;

  const { apiKeyId, apiKeySecret } = action.secrets;

  const isOrgIdInvalid: boolean = errors.orgId.length > 0 && orgId != null;
  const isApiKeyInvalid: boolean = errors.apiKeyId.length > 0 && apiKeyId != null;
  const isApiKeySecretInvalid: boolean = errors.apiKeySecret.length > 0 && apiKeySecret != null;

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
            id="connector-resilient-orgId-key"
            fullWidth
            error={errors.orgId}
            isInvalid={isOrgIdInvalid}
            label={i18n.ORG_ID_LABEL}
          >
            <EuiFieldText
              fullWidth
              isInvalid={isOrgIdInvalid}
              name="connector-resilient-orgId"
              value={orgId || ''} // Needed to prevent uncontrolled input error when value is undefined
              data-test-subj="connector-resilient-orgId-form-input"
              onChange={(evt) => handleOnChangeActionConfig('orgId', evt.target.value)}
              onBlur={() => {
                if (!orgId) {
                  editActionConfig('orgId', '');
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
            <h4>{i18n.API_KEY_LABEL}</h4>
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
            id="connector-resilient-apiKeyId"
            fullWidth
            error={errors.apiKeyId}
            isInvalid={isApiKeyInvalid}
            label={i18n.API_KEY_ID_LABEL}
          >
            <EuiFieldText
              fullWidth
              isInvalid={isApiKeyInvalid}
              readOnly={readOnly}
              name="connector-resilient-apiKeyId"
              value={apiKeyId || ''} // Needed to prevent uncontrolled input error when value is undefined
              data-test-subj="connector-resilient-apiKeyId-form-input"
              onChange={(evt) => handleOnChangeSecretConfig('apiKeyId', evt.target.value)}
              onBlur={() => {
                if (!apiKeyId) {
                  editActionSecrets('apiKeyId', '');
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
            id="connector-resilient-apiKeySecret"
            fullWidth
            error={errors.apiKeySecret}
            isInvalid={isApiKeySecretInvalid}
            label={i18n.API_KEY_SECRET_LABEL}
          >
            <EuiFieldPassword
              fullWidth
              readOnly={readOnly}
              isInvalid={isApiKeySecretInvalid}
              name="connector-resilient-apiKeySecret"
              value={apiKeySecret || ''} // Needed to prevent uncontrolled input error when value is undefined
              data-test-subj="connector-resilient-apiKeySecret-form-input"
              onChange={(evt) => handleOnChangeSecretConfig('apiKeySecret', evt.target.value)}
              onBlur={() => {
                if (!apiKeySecret) {
                  editActionSecrets('apiKeySecret', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      {consumer === 'case' && ( // TODO: remove this block later, when Case Resilient will move their fields to the level of action execution
        <>
          <EuiSpacer size="l" />
          <EuiFlexGroup>
            <EuiFlexItem data-test-subj="case-resilient-mappings">
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
        {i18n.REMEMBER_VALUES_LABEL}
      </EuiText>
    );
  }
  return (
    <EuiCallOut
      size="s"
      iconType="iInCircle"
      title={i18n.REENTER_VALUES_LABEL}
      data-test-subj="reenterValuesMessage"
    />
  );
}

// eslint-disable-next-line import/no-default-export
export { ResilientConnectorFields as default };
