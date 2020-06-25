/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useEffect } from 'react';

import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldPassword,
  EuiSpacer,
} from '@elastic/eui';

import { isEmpty } from 'lodash';
import { IErrorObject, ActionConnectorFieldsProps } from '../../../../types';
import * as i18n from './translations';
import { CasesConfigurationMapping, ResilientActionConnector } from './types';
import { connectorConfiguration } from './config';
import { FieldMapping } from './case_mappings/field_mapping';

export interface ConnectorFlyoutFormProps<T> {
  errors: IErrorObject;
  action: T;
  onChangeSecret: (key: string, value: string) => void;
  onBlurSecret: (key: string) => void;
  onChangeConfig: (key: string, value: string) => void;
  onBlurConfig: (key: string) => void;
}

const ServiceNowConnectorFields: React.FC<ActionConnectorFieldsProps<ResilientActionConnector>> = ({
  action,
  editActionSecrets,
  editActionConfig,
  errors,
  // editActionProperty,
}) => {
  // TODO: remove incidentConfiguration later, when Case IBM Resilient will move their fields to the level of action execution
  const { apiUrl, incidentConfiguration } = action.config;
  const mapping = incidentConfiguration ? incidentConfiguration.mapping : [];

  const isApiUrlInvalid: boolean = errors.apiUrl.length > 0 && apiUrl != null;

  const { apiKeyId, apiKeySecret } = action.secrets;

  const isApiKeyIdInvalid: boolean = errors.apiKeyId.length > 0 && apiKeyId != null;
  const isApiKeySecretInvalid: boolean = errors.apiKeySecret.length > 0 && apiKeySecret != null;

  // useEffect(() => {
  //   if (!action.consumer && editActionProperty) {
  //     editActionProperty('consumer', 'alerts');
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

  // TODO: remove this block later, when Case ServiceNow will move their fields to the level of action execution
  if (/* action.consumer === 'case' && */ isEmpty(mapping)) {
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
            id="connector-resilient-apiKeyId"
            fullWidth
            error={errors.apiKeyId}
            isInvalid={isApiKeyIdInvalid}
            label={i18n.RESILIENT_API_KEY_ID_LABEL}
          >
            <EuiFieldText
              fullWidth
              isInvalid={isApiKeyIdInvalid}
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
            label={i18n.RESILIENT_API_KEY_SECRET_LABEL}
          >
            <EuiFieldPassword
              fullWidth
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
      {incidentConfiguration && ( // TODO: remove this block later, when Case ServiceNow will move their fields to the level of action execution
        <>
          <EuiSpacer size="l" />
          <EuiFlexGroup>
            <EuiFlexItem data-test-subj="case-resilient-mappings">
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

export const createDefaultMapping = (fields: Record<string, any>): CasesConfigurationMapping[] =>
  Object.keys(fields).map(
    (key) =>
      ({
        source: fields[key].defaultSourceField,
        target: key,
        actionType: fields[key].defaultActionType,
      } as CasesConfigurationMapping)
  );

// eslint-disable-next-line import/no-default-export
export { ServiceNowConnectorFields as default };
