/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText } from '@elastic/eui';
import { AzureCredentialsType } from '../../../../common/types_old';
import { CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS } from '../../test_subjects';

export type AzureCredentialsFields = Record<
  string,
  { label: string; type?: 'password' | 'text'; testSubj?: string }
>;

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
    .filter(
      ({ value }) =>
        value !== 'arm_template' && // we remove this in order to hide it from the selectable options in the manual drop down
        value !== 'manual' && // TODO: remove 'manual' for stack version 8.13
        value !== 'service_principal_with_client_username_and_password' // this option is temporarily hidden
    );
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
        testSubj: field.testSubj,
        value: inputVar.value,
      } as const;
    });

const I18N_TENANT_ID = i18n.translate('xpack.csp.azureIntegration.tenantIdLabel', {
  defaultMessage: 'Tenant ID',
});

const I18N_CLIENT_ID = i18n.translate('xpack.csp.azureIntegration.clientIdLabel', {
  defaultMessage: 'Client ID',
});

export const getAzureCredentialsFormOptions = (): AzureOptions => ({
  managed_identity: {
    label: i18n.translate('xpack.csp.azureIntegration.credentialType.managedIdentityLabel', {
      defaultMessage: 'Managed Identity',
    }),
    info: (
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="xpack.csp.azureIntegration.credentialType.managedIdentityInfo"
          defaultMessage="Ensure the agent is deployed on a resource that supports managed identities (e.g., Azure Virtual Machines). No explicit credentials need to be provided; Azure handles the authentication."
        />
      </EuiText>
    ),
    fields: {},
  },
  arm_template: {
    label: 'ARM Template',
    info: [],
    fields: {},
  },
  // TODO: remove for stack version 8.13
  manual: {
    label: 'Manual',
    info: [],
    fields: {},
  },
  service_principal_with_client_secret: {
    label: i18n.translate('xpack.csp.azureIntegration.servicePrincipalWithClientSecretLabel', {
      defaultMessage: 'Service principal with Client Secret',
    }),
    fields: {
      'azure.credentials.tenant_id': {
        label: I18N_TENANT_ID,
        testSubj: CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID,
      },
      'azure.credentials.client_id': {
        label: I18N_CLIENT_ID,
        testSubj: CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID,
      },
      'azure.credentials.client_secret': {
        type: 'password',
        label: i18n.translate('xpack.csp.azureIntegration.clientSecretLabel', {
          defaultMessage: 'Client Secret',
        }),
        testSubj: CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_SECRET,
      },
    },
  },
  service_principal_with_client_certificate: {
    label: i18n.translate('xpack.csp.azureIntegration.servicePrincipalWithClientCertificateLabel', {
      defaultMessage: 'Service principal with Client Certificate',
    }),
    fields: {
      'azure.credentials.tenant_id': {
        label: I18N_TENANT_ID,
        testSubj: CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID,
      },
      'azure.credentials.client_id': {
        label: I18N_CLIENT_ID,
        testSubj: CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID,
      },
      'azure.credentials.client_certificate_path': {
        label: i18n.translate('xpack.csp.azureIntegration.clientCertificatePathLabel', {
          defaultMessage: 'Client Certificate Path',
        }),
        testSubj: CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_CERTIFICATE_PATH,
      },
      'azure.credentials.client_certificate_password': {
        type: 'password',
        label: i18n.translate('xpack.csp.azureIntegration.clientCertificatePasswordLabel', {
          defaultMessage: 'Client Certificate Password',
        }),
        testSubj: CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_CERTIFICATE_PASSWORD,
      },
    },
  },
  service_principal_with_client_username_and_password: {
    label: i18n.translate(
      'xpack.csp.azureIntegration.servicePrincipalWithClientUsernameAndPasswordLabel',
      { defaultMessage: 'Service principal with Client Username and Password' }
    ),
    fields: {
      'azure.credentials.tenant_id': {
        label: I18N_TENANT_ID,
        testSubj: CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID,
      },
      'azure.credentials.client_id': {
        label: I18N_CLIENT_ID,
        testSubj: CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID,
      },
      'azure.credentials.client_username': {
        label: i18n.translate('xpack.csp.azureIntegration.clientUsernameLabel', {
          defaultMessage: 'Client Username',
        }),
        testSubj: CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_USERNAME,
      },
      'azure.credentials.client_password': {
        type: 'password',
        label: i18n.translate('xpack.csp.azureIntegration.clientPasswordLabel', {
          defaultMessage: 'Client Password',
        }),
        testSubj: CIS_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_PASSWORD,
      },
    },
  },
});
