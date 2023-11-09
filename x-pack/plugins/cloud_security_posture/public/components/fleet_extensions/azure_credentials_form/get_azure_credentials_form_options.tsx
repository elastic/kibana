/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { AzureCredentialsType } from '../../../../common/types';

export type AzureCredentialsFields = Record<string, { label: string; type?: 'password' | 'text' }>;

export interface AzureOptionValue {
  label: string;
  info: React.ReactNode;
  fields: AzureCredentialsFields;
}

export type AzureOptions = Record<AzureCredentialsType, AzureOptionValue>;

export const getAzureCredentialsFormManualOptions = (): Array<{
  value: AzureCredentialsType;
  text: string;
}> => {
  return Object.entries(getAzureCredentialsFormOptions())
    .map(([key, value]) => ({
      value: key as AzureCredentialsType,
      text: value.label,
    }))
    .filter(({ value }) => value !== 'arm_template');
};

export const getInputVarsFields = (input: NewPackagePolicyInput, fields: AzureCredentialsFields) =>
  // Object.entries(input.streams[0].vars || {})
  Object.entries({ 'azure.credentials.client_id': { value: '' } } || {})
    .filter(([id]) => id in fields)
    .map(([id, inputVar]) => {
      const field = fields[id];
      return {
        id,
        label: field.label,
        type: field.type || 'text',
        value: inputVar.value,
      } as const;
    });

export const DEFAULT_AZURE_MANUAL_CREDENTIALS_TYPE = 'service_principal_with_client_secret';

const TemporaryKeysDescription = (
  <div>
    <EuiText color={'subdued'} size="s">
      <FormattedMessage
        id="xpack.csp.awsIntegration.temporaryKeysDescription"
        defaultMessage="You can configure temporary security credentials in AWS to last for a specified duration. They
      consist of an access key ID, a secret access key, and a security token, which is typically
      found using GetSessionToken."
      />
    </EuiText>
  </div>
);

export const getAzureCredentialsFormOptions = (): AzureOptions => ({
  arm_template: {
    label: 'ARM Template',
    info: [],
    fields: {},
  },
  service_principal_with_client_secret: {
    info: TemporaryKeysDescription,
    label: i18n.translate('xpack.csp.awsIntegration.temporaryKeysLabel', {
      defaultMessage: 'Service principal with Client Secret',
    }),
    fields: {
      'azure.credentials.tenant_id': { label: 'Tenant ID' },
      'azure.credentials.client_id': { label: 'Client ID' },
      'azure.credentials.client_secret': {
        type: 'password',
        label: i18n.translate('xpack.csp.awsIntegration.sessionTokenLabel', {
          defaultMessage: 'Client Secret',
        }),
      },
    },
  },
  service_principal_with_client_certificate: {
    info: TemporaryKeysDescription,
    label: i18n.translate('xpack.csp.awsIntegration.temporaryKeysLabel', {
      defaultMessage: 'Service principal with Client Certificate',
    }),
    fields: {
      'azure.credentials.tenant_id': { label: 'Tenant ID' },
      'azure.credentials.client_id': { label: 'Client ID' },
      'azure.credentials.client_certificate_path': {
        label: i18n.translate('xpack.csp.awsIntegration.sessionTokenLabel', {
          defaultMessage: 'Client Certificate Path',
        }),
      },
      'azure.credentials.client_certificate_password': {
        type: 'password',
        label: i18n.translate('xpack.csp.awsIntegration.sessionTokenLabel', {
          defaultMessage: 'Client Certificate Password',
        }),
      },
    },
  },
  service_principal_with_client_username_and_password: {
    info: TemporaryKeysDescription,
    label: i18n.translate('xpack.csp.awsIntegration.temporaryKeysLabel', {
      defaultMessage: 'Service principal with Client Username and Password',
    }),
    fields: {
      'azure.credentials.tenant_id': { label: 'Tenant ID' },
      'azure.credentials.client_id': { label: 'Client ID' },
      'azure.credentials.client_username': {
        label: i18n.translate('xpack.csp.awsIntegration.sessionTokenLabel', {
          defaultMessage: 'Client Username',
        }),
      },
      'azure.credentials.client_password': {
        type: 'password',
        label: i18n.translate('xpack.csp.awsIntegration.sessionTokenLabel', {
          defaultMessage: 'Client Password',
        }),
      },
    },
  },
  managed_identity: {
    label: i18n.translate('xpack.csp.azureIntegration.credentialType.manualLabel', {
      defaultMessage: 'Managed Identity',
    }),
    info: [],
    fields: {},
  },
});
