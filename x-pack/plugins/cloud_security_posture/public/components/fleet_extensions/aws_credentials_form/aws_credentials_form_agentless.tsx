/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import semverCompare from 'semver/functions/compare';
import semverValid from 'semver/functions/valid';
import { i18n } from '@kbn/i18n';

import {
  getTemplateUrlFromPackageInfo,
  SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS,
} from '../../../common/utils/get_template_url_package_info';
import { cspIntegrationDocsNavigation } from '../../../common/navigation/constants';
import {
  CLOUD_CREDENTIALS_PACKAGE_VERSION,
  SINGLE_ACCOUNT,
  TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR,
} from '../../../../common/constants';
import {
  DEFAULT_AGENTLESS_AWS_CREDENTIALS_TYPE,
  getAwsCredentialsFormAgentlessOptions,
  getAwsCredentialsFormOptions,
  getInputVarsFields,
} from './get_aws_credentials_form_options';
import { getAwsCredentialsType, getPosturePolicy } from '../utils';
import { AwsInputVarFields } from './aws_input_var_fields';
import {
  AwsFormProps,
  AWSSetupInfoContent,
  AwsCredentialTypeSelector,
} from './aws_credentials_form';

const CLOUD_FORMATION_EXTERNAL_DOC_URL =
  'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-whatis-howdoesitwork.html';

export const CloudFormationCloudCredentialsGuide = ({
  isOrganization,
}: {
  isOrganization?: boolean;
}) => {
  return (
    <EuiText>
      <p>
        <FormattedMessage
          id="xpack.csp.agentlessForm.cloudFormation.guide.description"
          defaultMessage="CloudFormation will create all the necessary resources to evaluate the security posture of your AWS environment. {learnMore}."
          values={{
            learnMore: (
              <EuiLink
                href={CLOUD_FORMATION_EXTERNAL_DOC_URL}
                target="_blank"
                rel="noopener nofollow noreferrer"
                data-test-subj="externalLink"
              >
                <FormattedMessage
                  id="xpack.csp.agentlessForm.cloudFormation.guide.learnMoreLinkText"
                  defaultMessage="Learn more about CloudFormation"
                />
              </EuiLink>
            ),
          }}
        />
      </p>
      <EuiText size="s" color="subdued">
        <ol>
          {isOrganization ? (
            <li>
              <FormattedMessage
                id="xpack.csp.agentlessForm.cloudFormation.guide.steps.organizationLogin"
                defaultMessage="Log in as an admin in the management account of the AWS Organization you want to onboard"
              />
            </li>
          ) : (
            <li>
              <FormattedMessage
                id="xpack.csp.agentlessForm.cloudFormation.guide.steps.login"
                defaultMessage="Log in as an admin in the AWS account you want to onboard"
              />
            </li>
          )}
          <li>
            <FormattedMessage
              id="xpack.csp.agentlessForm.cloudFormation.guide.steps.launch"
              defaultMessage="Click the Launch CloudFormation button below."
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.csp.agentlessForm.cloudFormation.steps.region"
              defaultMessage="(Optional) Change the Amazon region in the upper right corner to the region you want to deploy your stack to"
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.csp.agentlessForm.cloudFormation.gsteps.accept"
              defaultMessage="Tick the checkbox under capabilities in the opened CloudFormation stack review form: {acknowledge}"
              values={{
                acknowledge: (
                  <strong>
                    <FormattedMessage
                      id="xpack.csp.agentlessForm.cloudFormation.steps.accept.acknowledge"
                      defaultMessage="I acknowledge that AWS CloudFormation might create IAM resources."
                    />
                  </strong>
                ),
              }}
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.csp.agentlessForm.cloudFormation.steps.create"
              defaultMessage="Click Create stack."
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.csp.agentlessForm.cloudFormation.steps.stackStatus"
              defaultMessage="Once  stack status is CREATE_COMPLETE then click the Ouputs tab"
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.csp.agentlessForm.cloudFormation.steps.credentials"
              defaultMessage="Copy Access Key Id and Secret Access Key then paste the credentials below"
            />
          </li>
        </ol>
      </EuiText>
    </EuiText>
  );
};

export const AwsCredentialsFormAgentless = ({
  input,
  newPolicy,
  packageInfo,
  updatePolicy,
}: AwsFormProps) => {
  const awsCredentialsType = getAwsCredentialsType(input) || DEFAULT_AGENTLESS_AWS_CREDENTIALS_TYPE;
  const options = getAwsCredentialsFormOptions();
  const group = options[awsCredentialsType];
  const fields = getInputVarsFields(input, group.fields);
  const integrationLink = cspIntegrationDocsNavigation.cspm.getStartedPath;
  const accountType = input?.streams?.[0].vars?.['aws.account_type']?.value ?? SINGLE_ACCOUNT;

  const isValidSemantic = semverValid(packageInfo.version);
  const showCloudCredentialsButton = isValidSemantic
    ? semverCompare(packageInfo.version, CLOUD_CREDENTIALS_PACKAGE_VERSION) >= 0
    : false;

  const automationCredentialTemplate = getTemplateUrlFromPackageInfo(
    packageInfo,
    input.policy_template,
    SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS.CLOUD_FORMATION_CREDENTIALS
  )?.replace(TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR, accountType);

  return (
    <>
      <AWSSetupInfoContent
        info={
          <FormattedMessage
            id="xpack.csp.awsIntegration.gettingStarted.setupInfoContentAgentless"
            defaultMessage="Utilize AWS Access Keys to set up and deploy CSPM for assessing your AWS environment's security posture. Refer to our {gettingStartedLink} guide for details."
            values={{
              gettingStartedLink: (
                <EuiLink href={integrationLink} target="_blank">
                  <FormattedMessage
                    id="xpack.csp.awsIntegration.gettingStarted.setupInfoContentLink"
                    defaultMessage="Getting Started"
                  />
                </EuiLink>
              ),
            }}
          />
        }
      />
      <EuiSpacer size="l" />
      <AwsCredentialTypeSelector
        label={i18n.translate('xpack.csp.awsIntegration.awsCredentialTypeSelectorLabelAgentless', {
          defaultMessage: 'Preferred method',
        })}
        type={awsCredentialsType}
        options={getAwsCredentialsFormAgentlessOptions()}
        onChange={(optionId) => {
          updatePolicy(
            getPosturePolicy(newPolicy, input.type, {
              'aws.credentials.type': { value: optionId },
            })
          );
        }}
      />
      <EuiSpacer size="m" />
      {!showCloudCredentialsButton && (
        <>
          <EuiCallOut color="warning">
            <FormattedMessage
              id="xpack.csp.fleetIntegration.awsCloudCredentials.cloudFormationSupportedMessage"
              defaultMessage="Launch Cloud Formation for Automated Credentials not supported in current integration version. Please upgrade to the latest version to enable Launch CloudFormation for automated credentials."
            />
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}
      {awsCredentialsType === DEFAULT_AGENTLESS_AWS_CREDENTIALS_TYPE &&
        showCloudCredentialsButton && (
          <>
            <EuiSpacer size="m" />
            <EuiButton
              data-test-subj="launchCloudFormationAgentlessButton"
              target="_blank"
              iconSide="left"
              iconType="launch"
              href={automationCredentialTemplate}
            >
              <FormattedMessage
                id="xpack.csp.agentlessForm.agentlessAWSCredentialsForm.cloudFormation.launchButton"
                defaultMessage="Launch CloudFormation"
              />
            </EuiButton>
            <EuiSpacer size="m" />
          </>
        )}
      <AwsInputVarFields
        fields={fields}
        packageInfo={packageInfo}
        onChange={(key, value) => {
          updatePolicy(getPosturePolicy(newPolicy, input.type, { [key]: { value } }));
        }}
      />
    </>
  );
};
