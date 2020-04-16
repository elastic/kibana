/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, ChangeEvent, useEffect } from 'react';
import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiFieldPassword,
} from '@elastic/eui';

import { isEmpty, get } from 'lodash/fp';

import {
  ActionConnectorFieldsProps,
  ActionTypeModel,
  ValidationResult,
  ActionParamsProps,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../../../plugins/triggers_actions_ui/public/types';

import { FieldMapping } from '../../../pages/case/components/configure_cases/field_mapping';

import * as i18n from './translations';

import { ResilientActionConnector } from './types';
import { isUrlInvalid } from '../validators';

import { defaultMapping } from '../config';
import { CasesConfigurationMapping } from '../../../containers/case/configure/types';

import { connector } from './config';

interface ResilientActionParams {
  message: string;
}

interface Errors {
  apiUrl: string[];
  orgId: string[];
  apiKey: string[];
  apiSecret: string[];
}

export function getActionType(): ActionTypeModel {
  return {
    id: connector.id,
    iconClass: connector.logo,
    selectMessage: i18n.RESILIENT_DESC,
    actionTypeTitle: connector.name,
    validateConnector: (action: ResilientActionConnector): ValidationResult => {
      const errors: Errors = {
        apiUrl: [],
        orgId: [],
        apiKey: [],
        apiSecret: [],
      };

      if (!action.config.apiUrl) {
        errors.apiUrl = [...errors.apiUrl, i18n.API_URL_REQUIRED];
      }

      if (isUrlInvalid(action.config.apiUrl)) {
        errors.apiUrl = [...errors.apiUrl, i18n.API_URL_INVALID];
      }

      if (!action.config.orgId) {
        errors.orgId = [...errors.orgId, i18n.RESILIENT_ORG_ID_REQUIRED];
      }

      if (!action.secrets.apiKey) {
        errors.apiKey = [...errors.apiKey, i18n.API_KEY_REQUIRED];
      }

      if (!action.secrets.apiSecret) {
        errors.apiSecret = [...errors.apiSecret, i18n.API_SECRET_REQUIRED];
      }

      return { errors };
    },
    validateParams: (actionParams: ResilientActionParams): ValidationResult => {
      return { errors: {} };
    },
    actionConnectorFields: ResilientConnectorFields,
    actionParamsFields: ResilientParamsFields,
  };
}

const ResilientConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps<
  ResilientActionConnector
>> = ({ action, editActionConfig, editActionSecrets, errors }) => {
  /* We do not provide defaults values to the fields (like empty string for apiUrl) intentionally.
   * If we do, errors will be shown the first time the flyout is open even though the user did not
   * interact with the form. Also, we would like to show errors for empty fields provided by the user.
  /*/
  const { apiUrl, orgId, casesConfiguration: { mapping = [] } = {} } = action.config;
  const { apiKey, apiSecret } = action.secrets;

  const isApiUrlInvalid: boolean = errors.apiUrl.length > 0 && apiUrl != null;
  const isOrgIdInvalid: boolean = errors.orgId.length > 0 && orgId != null;
  const isApiKeyInvalid: boolean = errors.apiKey.length > 0 && apiKey != null;
  const isApiSecretInvalid: boolean = errors.apiSecret.length > 0 && apiSecret != null;

  /**
   * We need to distinguish between the add flyout and the edit flyout.
   * useEffect will run only once on component mount.
   * This guarantees that the function below will run only once.
   * On the first render of the component the apiUrl can be either undefined or filled.
   * If it is filled then we are on the edit flyout. Otherwise we are on the add flyout.
   */

  useEffect(() => {
    if (!isEmpty(apiUrl)) {
      editActionSecrets('apiKey', '');
      editActionSecrets('apiSecret', '');
    }
  }, []);

  if (isEmpty(mapping)) {
    editActionConfig('casesConfiguration', {
      ...action.config.casesConfiguration,
      mapping: defaultMapping,
    });
  }

  const handleOnChangeActionConfig = useCallback(
    (key: string, evt: ChangeEvent<HTMLInputElement>) => editActionConfig(key, evt.target.value),
    []
  );

  const handleOnBlurActionConfig = useCallback(
    (key: string) => {
      if (['apiUrl', 'orgId'].includes(key) && get(key, action.config) == null) {
        editActionConfig(key, '');
      }
    },
    [action.config]
  );

  const handleOnChangeSecretConfig = useCallback(
    (key: string, evt: ChangeEvent<HTMLInputElement>) => editActionSecrets(key, evt.target.value),
    []
  );

  const handleOnBlurSecretConfig = useCallback(
    (key: string) => {
      if (['apiKey', 'apiSecret'].includes(key) && get(key, action.secrets) == null) {
        editActionSecrets(key, '');
      }
    },
    [action.secrets]
  );

  const handleOnChangeMappingConfig = useCallback(
    (newMapping: CasesConfigurationMapping[]) =>
      editActionConfig('casesConfiguration', {
        ...action.config.casesConfiguration,
        mapping: newMapping,
      }),
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
              placeholder="https://<instance>.service-now.com"
              onChange={handleOnChangeActionConfig.bind(null, 'apiUrl')}
              onBlur={handleOnBlurActionConfig.bind(null, 'apiUrl')}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="orgId"
            fullWidth
            error={errors.orgId}
            isInvalid={isOrgIdInvalid}
            label={i18n.RESILIENT_ORG_ID}
          >
            <EuiFieldText
              fullWidth
              isInvalid={isOrgIdInvalid}
              name="orgId"
              value={orgId || ''} // Needed to prevent uncontrolled input error when value is undefined
              data-test-subj="orgIdFromInput"
              onChange={handleOnChangeActionConfig.bind(null, 'orgId')}
              onBlur={handleOnBlurActionConfig.bind(null, 'orgId')}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="connector-resilient-apiKey"
            fullWidth
            error={errors.apiKey}
            isInvalid={isApiKeyInvalid}
            label={i18n.API_KEY_LABEL}
          >
            <EuiFieldText
              fullWidth
              isInvalid={isApiKeyInvalid}
              name="connector-resilient-apiKey"
              value={apiKey || ''} // Needed to prevent uncontrolled input error when value is undefined
              data-test-subj="apiKeyFromInput"
              onChange={handleOnChangeSecretConfig.bind(null, 'apiKey')}
              onBlur={handleOnBlurSecretConfig.bind(null, 'apiKey')}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="connector-resilient-apiSecret"
            fullWidth
            error={errors.apiSecret}
            isInvalid={isApiSecretInvalid}
            label={i18n.API_SECRET_LABEL}
          >
            <EuiFieldPassword
              fullWidth
              isInvalid={isApiSecretInvalid}
              name="connector-resilient-apiSecret"
              value={apiSecret || ''} // Needed to prevent uncontrolled input error when value is undefined
              data-test-subj="apiSecretFromInput"
              onChange={handleOnChangeSecretConfig.bind(null, 'apiSecret')}
              onBlur={handleOnBlurSecretConfig.bind(null, 'apiSecret')}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <FieldMapping
            disabled={true}
            mapping={mapping as CasesConfigurationMapping[]}
            onChangeMapping={handleOnChangeMappingConfig}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

const ResilientParamsFields: React.FunctionComponent<ActionParamsProps<ResilientActionParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
}) => {
  return null;
};
