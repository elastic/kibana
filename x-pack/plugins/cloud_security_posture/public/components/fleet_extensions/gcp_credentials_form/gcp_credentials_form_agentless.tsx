/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';

import {
  GcpFormProps,
  GCPSetupInfoContent,
  GcpInputVarFields,
  gcpField,
  getInputVarsFields,
} from './gcp_credential_form';
import { getPosturePolicy } from '../utils';
import { ReadDocumentation } from '../aws_credentials_form/aws_credentials_form';
import { cspIntegrationDocsNavigation } from '../../../common/navigation/constants';

export const GcpCredentialsFormAgentless = ({
  input,
  newPolicy,
  updatePolicy,
  disabled,
}: GcpFormProps) => {
  // atm only JSON blob is supported by GCP in agentless, filtering out other options
  const fields = getInputVarsFields(input, gcpField.fields).filter((field) =>
    ['gcp.organization_id', 'gcp.project_id', 'gcp.credentials.json'].includes(field.id)
  );
  const accountType = input.streams?.[0]?.vars?.['gcp.account_type']?.value;
  const isOrganization = accountType === 'organization-account';

  return (
    <>
      <GCPSetupInfoContent />
      <EuiSpacer size="l" />
      <GcpInputVarFields
        disabled={disabled}
        fields={fields}
        onChange={(key, value) =>
          updatePolicy(getPosturePolicy(newPolicy, input.type, { [key]: { value } }))
        }
        isOrganization={isOrganization}
      />
      <EuiSpacer size="s" />
      <ReadDocumentation url={cspIntegrationDocsNavigation.cspm.getStartedPath} />
      <EuiSpacer />
    </>
  );
};
