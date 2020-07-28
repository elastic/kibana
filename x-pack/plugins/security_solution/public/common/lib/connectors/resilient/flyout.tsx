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
import { ResilientActionConnector } from './types';
import { withConnectorFlyout } from '../components/connector_flyout';

const resilientConnectorForm: React.FC<ConnectorFlyoutFormProps<ResilientActionConnector>> = ({
  errors,
  action,
  onChangeSecret,
  onBlurSecret,
  onChangeConfig,
  onBlurConfig,
}) => {
  const { orgId } = action.config;
  const { apiKeyId, apiKeySecret } = action.secrets;
  const isOrgIdInvalid: boolean = errors.orgId.length > 0 && orgId != null;
  const isApiKeyIdInvalid: boolean = errors.apiKeyId.length > 0 && apiKeyId != null;
  const isApiKeySecretInvalid: boolean = errors.apiKeySecret.length > 0 && apiKeySecret != null;

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="connector-resilient-org-id"
            fullWidth
            error={errors.orgId}
            isInvalid={isOrgIdInvalid}
            label={i18n.RESILIENT_PROJECT_KEY_LABEL}
          >
            <EuiFieldText
              fullWidth
              isInvalid={isOrgIdInvalid}
              name="connector-resilient-project-key"
              value={orgId || ''} // Needed to prevent uncontrolled input error when value is undefined
              data-test-subj="connector-resilient-project-key-form-input"
              onChange={(evt) => onChangeConfig('orgId', evt.target.value)}
              onBlur={() => onBlurConfig('orgId')}
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
              onChange={(evt) => onChangeSecret('apiKeyId', evt.target.value)}
              onBlur={() => onBlurSecret('apiKeyId')}
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
              onChange={(evt) => onChangeSecret('apiKeySecret', evt.target.value)}
              onBlur={() => onBlurSecret('apiKeySecret')}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

export const resilientConnectorFlyout = withConnectorFlyout<ResilientActionConnector>({
  ConnectorFormComponent: resilientConnectorForm,
  secretKeys: ['apiKeyId', 'apiKeySecret'],
  configKeys: ['orgId'],
  connectorActionTypeId: '.resilient',
});

// eslint-disable-next-line import/no-default-export
export { resilientConnectorFlyout as default };
