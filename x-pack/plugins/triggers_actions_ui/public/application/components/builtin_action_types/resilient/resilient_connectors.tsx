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

import { ActionConnectorFieldsProps } from '../../../../types';
import * as i18n from './translations';
import { ResilientActionConnector } from './types';

const ResilientConnectorFields: React.FC<ActionConnectorFieldsProps<ResilientActionConnector>> = ({
  action,
  editActionSecrets,
  editActionConfig,
  errors,
  readOnly,
}) => {
  const { apiUrl, orgId } = action.config;
  const isApiUrlInvalid: boolean = errors.apiUrl.length > 0 && apiUrl !== undefined;

  const { apiKeyId, apiKeySecret } = action.secrets;

  const isOrgIdInvalid: boolean = errors.orgId.length > 0 && orgId !== undefined;
  const isApiKeyInvalid: boolean = errors.apiKeyId.length > 0 && apiKeyId !== undefined;
  const isApiKeySecretInvalid: boolean =
    errors.apiKeySecret.length > 0 && apiKeySecret !== undefined;

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
