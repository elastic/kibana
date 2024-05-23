/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCodeBlock, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';

import {
  getTemplateUrlFromPackageInfo,
  SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS,
} from '@kbn/fleet-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import {
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

const GOOGLE_CLOUD_SHELL_EXTERNAL_DOC_URL = 'https://cloud.google.com/shell/docs';

const GoogleCloudShellCredentialsGuide = (props: {
  commandText: string;
  isOrganization?: boolean;
}) => {
  return (
    <>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.csp.agentlessForm.googleCloudShell.guide.description"
            defaultMessage="The Google Cloud Shell Command below will create all the necessary resources to evaluate the security posture of your GCP projects. Learn more about {learnMore}."
            values={{
              learnMore: (
                <EuiLink
                  href={GOOGLE_CLOUD_SHELL_EXTERNAL_DOC_URL}
                  target="_blank"
                  rel="noopener nofollow noreferrer"
                  data-test-subj="externalLink"
                >
                  <FormattedMessage
                    id="xpack.csp.AgentlessForm.googleCloudShell.cloudCredentials.steps.learnMoreLinkText"
                    defaultMessage="Google Cloud Shell"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
        <EuiText size="s" color="subdued">
          <ol>
            <li>
              <>
                {props?.isOrganization ? (
                  <FormattedMessage
                    id="xpack.csp.agentlessForm.googleCloudShell.cloudCredentials.organization.steps.copyWithoutProjectId"
                    defaultMessage="Replace <PROJECT_ID> and <ORG_ID_VALUE> in the following command with your project ID and organization ID  then copy the command"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.csp.agentlessForm.googleCloudShell.cloudCredentials.singleAccount.steps.copyWithProjectId"
                    defaultMessage="Replace <PROJECT_ID> in the following command with your project ID then copy the command"
                  />
                )}
                <EuiSpacer size="m" />
                <EuiCodeBlock language="bash" isCopyable contentEditable="true">
                  {props.commandText}
                </EuiCodeBlock>
              </>
            </li>
            <li>
              <FormattedMessage
                id="xpack.csp.agentlessForm.googleCloudShell.cloudCredentials.steps.launch"
                defaultMessage="Click Launch Google Cloud Shell, then run the command"
              />
            </li>
          </ol>
        </EuiText>
      </EuiText>
    </>
  );
};

export const GcpCredentialsFormAgentless = ({
  input,
  newPolicy,
  updatePolicy,
  packageInfo,
  disabled,
}: GcpFormProps) => {
  const accountType = input.streams?.[0]?.vars?.['gcp.account_type']?.value;
  const isOrganization = accountType === ORGANIZATION_ACCOUNT;
  const organizationFields = ['gcp.organization_id', 'gcp.credentials.json'];
  const singleAccountFields = ['gcp.project_id', 'gcp.credentials.json'];

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

  const cloudShellCredentialsCommand = `gcloud config set project <PROJECT_ID> ${
    isOrganization ? `&& ORG_ID=<ORG_ID_VALUE>` : ''
  } && ./deploy_service_account.sh`;

  return (
    <>
      <EuiSpacer size="m" />
      <GoogleCloudShellCredentialsGuide
        commandText={cloudShellCredentialsCommand}
        isOrganization={isOrganization}
      />
      <EuiSpacer size="m" />
      <EuiButton
        data-test-subj="agentlessLaunchGoogleCloudShellButtonTestId"
        target="_blank"
        iconSide="left"
        iconType="launch"
        href={cloudShellUrl}
      >
        <FormattedMessage
          id="xpack.csp.agentlessForm..googleCloudShell.cloudCredentials.button"
          defaultMessage="Launch Google Cloud Shell"
        />
      </EuiButton>
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
