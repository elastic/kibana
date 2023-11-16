/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { AzureCredentialsType } from '../../../../common/types';

export type AzureCredentialsFields = Record<string, { label: string; type?: 'password' | 'text' }>;

export interface AzureOptionValue {
  label: string;
  info?: React.ReactNode;
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
  Object.entries(input.streams[0].vars || {})
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

const I18N_TENANT_ID = i18n.translate('xpack.csp.azureIntegration.tenantIdLabel', {
  defaultMessage: 'Tenant ID',
});

const I18N_CLIENT_ID = i18n.translate('xpack.csp.azureIntegration.clientIdLabel', {
  defaultMessage: 'Client ID',
});

export const getAzureCredentialsFormOptions = (): AzureOptions => ({
  arm_template: {
    label: 'ARM Template',
    info: [],
    fields: {},
  },
  service_principal_with_client_secret: {
    label: i18n.translate('xpack.csp.azureIntegration.servicePrincipalWithClientSecretLabel', {
      defaultMessage: 'Service principal with Client Secret',
    }),
    fields: {
      'azure.credentials.tenant_id': { label: I18N_TENANT_ID },
      'azure.credentials.client_id': { label: I18N_CLIENT_ID },
      'azure.credentials.client_secret': {
        type: 'password',
        label: i18n.translate('xpack.csp.azureIntegration.clientSecretLabel', {
          defaultMessage: 'Client Secret',
        }),
      },
    },
  },
  service_principal_with_client_certificate: {
    label: i18n.translate('xpack.csp.azureIntegration.servicePrincipalWithClientCertificateLabel', {
      defaultMessage: 'Service principal with Client Certificate',
    }),
    fields: {
      'azure.credentials.tenant_id': { label: I18N_TENANT_ID },
      'azure.credentials.client_id': { label: I18N_CLIENT_ID },
      'azure.credentials.client_certificate_path': {
        label: i18n.translate('xpack.csp.azureIntegration.clientCertificatePathLabel', {
          defaultMessage: 'Client Certificate Path',
        }),
      },
      'azure.credentials.client_certificate_password': {
        type: 'password',
        label: i18n.translate('xpack.csp.azureIntegration.clientCertificatePasswordLabel', {
          defaultMessage: 'Client Certificate Password',
        }),
      },
    },
  },
  service_principal_with_client_username_and_password: {
    label: i18n.translate(
      'xpack.csp.azureIntegration.servicePrincipalWithClientUsernameAndPasswordLabel',
      { defaultMessage: 'Service principal with Client Username and Password' }
    ),
    fields: {
      'azure.credentials.tenant_id': { label: I18N_TENANT_ID },
      'azure.credentials.client_id': { label: I18N_CLIENT_ID },
      'azure.credentials.client_username': {
        label: i18n.translate('xpack.csp.azureIntegration.clientUsernameLabel', {
          defaultMessage: 'Client Username',
        }),
      },
      'azure.credentials.client_password': {
        type: 'password',
        label: i18n.translate('xpack.csp.azureIntegration.clientPasswordLabel', {
          defaultMessage: 'Client Password',
        }),
      },
    },
  },
  managed_identity: {
    label: i18n.translate('xpack.csp.azureIntegration.credentialType.managedIdentityLabel', {
      defaultMessage: 'Managed Identity',
    }),
    info: [],
    fields: {},
  },
  manual: {
    label: i18n.translate('xpack.csp.azureIntegration.credentialType.manualLabel', {
      defaultMessage: 'Manual',
    }),
    info: [],
    fields: {},
  },
});
