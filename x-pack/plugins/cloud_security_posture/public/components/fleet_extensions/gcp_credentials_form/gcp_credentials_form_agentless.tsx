/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut, EuiSpacer } from '@elastic/eui';
import semverCompare from 'semver/functions/compare';
import semverValid from 'semver/functions/valid';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  getTemplateUrlFromPackageInfo,
  SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS,
} from '../../../common/utils/get_template_url_package_info';
import {
  CLOUD_CREDENTIALS_PACKAGE_VERSION,
  ORGANIZATION_ACCOUNT,
  TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR,
} from '../../../../common/constants';
import {
  GcpFormProps,
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
  packageInfo,
}: GcpFormProps) => {
  const accountType = input.streams?.[0]?.vars?.['gcp.account_type']?.value;
  const isOrganization = accountType === ORGANIZATION_ACCOUNT;
  const organizationFields = ['gcp.organization_id', 'gcp.credentials.json'];
  const singleAccountFields = ['gcp.project_id', 'gcp.credentials.json'];

  const isValidSemantic = semverValid(packageInfo.version);
  const showCloudCredentialsButton = isValidSemantic
    ? semverCompare(packageInfo.version, CLOUD_CREDENTIALS_PACKAGE_VERSION) >= 0
    : false;

  /*
    For Agentless only JSON credentials type is supported.
    Also in case of organisation setup, project_id is not required in contrast to Agent-based.
   */
  const fields = getInputVarsFields(input, gcpField.fields).filter((field) => {
    if (isOrganization) {
      return organizationFields.includes(field.id);
    } else {
      return singleAccountFields.includes(field.id);
    }
  });

  const cloudShellUrl = getTemplateUrlFromPackageInfo(
    packageInfo,
    input.policy_template,
    SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS.CLOUD_SHELL_URL
  )?.replace(TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR, accountType);

  return (
    <>
      <EuiSpacer size="m" />
      {!showCloudCredentialsButton && (
        <>
          <EuiCallOut color="warning">
            <FormattedMessage
              id="xpack.csp.fleetIntegration.gcpCloudCredentials.cloudFormationSupportedMessage"
              defaultMessage="Launch Cloud Shell for automated credentials not supported in current integration version. Please upgrade to the latest version to enable Launch Cloud Shell for automated credentials."
            />
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}
      {showCloudCredentialsButton && (
        <>
          <EuiButton
            data-test-subj="launchGoogleCloudShellAgentlessButton"
            target="_blank"
            iconSide="left"
            iconType="launch"
            href={cloudShellUrl}
          >
            <FormattedMessage
              id="xpack.csp.agentlessForm.googleCloudShell.cloudCredentials.button"
              defaultMessage="Launch Google Cloud Shell"
            />
          </EuiButton>
          <EuiSpacer size="l" />
        </>
      )}
      <GcpInputVarFields
        disabled={disabled}
        fields={fields}
        onChange={(key, value) =>
          updatePolicy(getPosturePolicy(newPolicy, input.type, { [key]: { value } }))
        }
        isOrganization={isOrganization}
        packageInfo={packageInfo}
      />
      <EuiSpacer size="s" />
      <ReadDocumentation url={cspIntegrationDocsNavigation.cspm.getStartedPath} />
      <EuiSpacer />
    </>
  );
};
