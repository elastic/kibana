/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiCallOut,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { SetupTechnology } from '@kbn/fleet-plugin/public';
import { NewPackagePolicyInput, PackageInfo } from '@kbn/fleet-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  DEFAULT_AGENTLESS_AWS_CREDENTIALS_TYPE,
  DEFAULT_MANUAL_AWS_CREDENTIALS_TYPE,
  getAwsCredentialsFormManualOptions,
} from './get_aws_credentials_form_options';
import { RadioGroup } from '../csp_boxed_radio_group';
import {
  getCspmCloudFormationDefaultValue,
  getPosturePolicy,
  NewPackagePolicyPostureInput,
} from '../utils';
import { SetupFormat, useAwsCredentialsForm } from './hooks';
import { AWS_ORGANIZATION_ACCOUNT } from '../policy_template_form';
import { AwsCredentialsType } from '../../../../common/types';
import { AwsInputVarFields } from './aws_input_var_fields';

interface AWSSetupInfoContentProps {
  integrationLink: string;
}
const AWSSetupInfoContent = ({ integrationLink }: AWSSetupInfoContentProps) => {
  return (
    <>
      <EuiHorizontalRule margin="xl" />
      <EuiTitle size="xs">
        <h2>
          <FormattedMessage
            id="xpack.csp.awsIntegration.setupInfoContentTitle"
            defaultMessage="Setup Access"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="l" />
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="xpack.csp.awsIntegration.gettingStarted.setupInfoContent"
          defaultMessage="Utilize AWS CloudFormation (a built-in AWS tool) or a series of manual steps to set up and deploy CSPM for assessing your AWS environment's security posture. Refer to our {gettingStartedLink} guide for details."
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
      </EuiText>
    </>
  );
};

const getSetupFormatOptions = (): Array<{ id: SetupFormat; label: string }> => [
  {
    id: 'cloud_formation',
    label: 'CloudFormation',
  },
  {
    id: 'manual',
    label: i18n.translate('xpack.csp.awsIntegration.setupFormatOptions.manual', {
      defaultMessage: 'Manual',
    }),
  },
];

export const getDefaultAwsVarsGroup = (
  packageInfo: PackageInfo,
  setupTechnology?: SetupTechnology
): AwsCredentialsType => {
  if (setupTechnology && setupTechnology === SetupTechnology.AGENTLESS) {
    return DEFAULT_AGENTLESS_AWS_CREDENTIALS_TYPE;
  }

  const hasCloudFormationTemplate = !!getCspmCloudFormationDefaultValue(packageInfo);
  if (hasCloudFormationTemplate) {
    return 'cloud_formation';
  }

  return DEFAULT_MANUAL_AWS_CREDENTIALS_TYPE;
};

export interface AwsFormProps {
  newPolicy: NewPackagePolicy;
  input: Extract<NewPackagePolicyPostureInput, { type: 'cloudbeat/cis_aws' }>;
  updatePolicy(updatedPolicy: NewPackagePolicy): void;
  packageInfo: PackageInfo;
  onChange: any;
  setIsValid: (isValid: boolean) => void;
  disabled: boolean;
}

const CloudFormationSetup = ({
  hasCloudFormationTemplate,
  input,
}: {
  hasCloudFormationTemplate: boolean;
  input: NewPackagePolicyInput;
}) => {
  if (!hasCloudFormationTemplate) {
    return (
      <EuiCallOut color="warning">
        <FormattedMessage
          id="xpack.csp.awsIntegration.cloudFormationSetupStep.notSupported"
          defaultMessage="CloudFormation is not supported on the current Integration version, please upgrade your integration to the latest version to use CloudFormation"
        />
      </EuiCallOut>
    );
  }

  const accountType = input.streams?.[0]?.vars?.['aws.account_type']?.value;

  return (
    <>
      <EuiText color="subdued" size="s">
        <ol
          css={css`
            list-style: auto;
          `}
        >
          <li>
            <FormattedMessage
              id="xpack.csp.awsIntegration.cloudFormationSetupStep.hostRequirement"
              defaultMessage='Ensure "New hosts" is selected in the "Where to add this integration?" section below'
            />
          </li>
          {accountType === AWS_ORGANIZATION_ACCOUNT ? (
            <li>
              <FormattedMessage
                id="xpack.csp.awsIntegration.cloudFormationSetupStep.organizationLogin"
                defaultMessage="Log in as an admin in your organization's AWS management account"
              />
            </li>
          ) : (
            <li>
              <FormattedMessage
                id="xpack.csp.awsIntegration.cloudFormationSetupStep.login"
                defaultMessage="Log in as an admin to the AWS Account you want to onboard"
              />
            </li>
          )}
          <li>
            <FormattedMessage
              id="xpack.csp.awsIntegration.cloudFormationSetupStep.save"
              defaultMessage="Click the Save and continue button on the bottom right of this page"
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.csp.awsIntegration.cloudFormationSetupStep.launch"
              defaultMessage="On the subsequent pop-up modal, click the Launch CloudFormation button."
            />
          </li>
        </ol>
      </EuiText>
      <EuiSpacer size="l" />
      <ReadDocumentation url={CLOUD_FORMATION_EXTERNAL_DOC_URL} />
    </>
  );
};

const CLOUD_FORMATION_EXTERNAL_DOC_URL =
  'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-whatis-howdoesitwork.html';

const Link = ({ children, url }: { children: React.ReactNode; url: string }) => (
  <EuiLink
    href={url}
    target="_blank"
    rel="noopener nofollow noreferrer"
    data-test-subj="externalLink"
  >
    {children}
  </EuiLink>
);

export const ReadDocumentation = ({ url }: { url: string }) => {
  return (
    <EuiText color="subdued" size="s">
      <FormattedMessage
        id="xpack.csp.awsIntegration.cloudFormationSetupNote"
        defaultMessage="Read the {documentation} for more details"
        values={{
          documentation: (
            <Link url={url}>
              {i18n.translate('xpack.csp.awsIntegration.documentationLinkText', {
                defaultMessage: 'documentation',
              })}
            </Link>
          ),
        }}
      />
    </EuiText>
  );
};

export const AwsCredentialsForm = ({
  input,
  newPolicy,
  updatePolicy,
  packageInfo,
  onChange,
  setIsValid,
  disabled,
}: AwsFormProps) => {
  const {
    awsCredentialsType,
    setupFormat,
    group,
    fields,
    integrationLink,
    hasCloudFormationTemplate,
    onSetupFormatChange,
  } = useAwsCredentialsForm({
    newPolicy,
    input,
    packageInfo,
    onChange,
    setIsValid,
    updatePolicy,
  });

  return (
    <>
      <AWSSetupInfoContent integrationLink={integrationLink} />
      <EuiSpacer size="l" />
      <RadioGroup
        disabled={disabled}
        size="m"
        options={getSetupFormatOptions()}
        idSelected={setupFormat}
        onChange={(idSelected: SetupFormat) =>
          idSelected !== setupFormat && onSetupFormatChange(idSelected)
        }
      />
      <EuiSpacer size="l" />
      {setupFormat === 'cloud_formation' && (
        <CloudFormationSetup hasCloudFormationTemplate={hasCloudFormationTemplate} input={input} />
      )}
      {setupFormat === 'manual' && (
        <>
          <AwsCredentialTypeSelector
            type={awsCredentialsType}
            onChange={(optionId) => {
              updatePolicy(
                getPosturePolicy(newPolicy, input.type, {
                  'aws.credentials.type': { value: optionId },
                })
              );
            }}
          />
          <EuiSpacer size="m" />
          {group.info}
          <EuiSpacer size="m" />
          <ReadDocumentation url={integrationLink} />
          <EuiSpacer size="l" />
          <AwsInputVarFields
            fields={fields}
            onChange={(key, value) => {
              updatePolicy(getPosturePolicy(newPolicy, input.type, { [key]: { value } }));
            }}
          />
        </>
      )}
      <EuiSpacer />
    </>
  );
};
export const AwsCredentialTypeSelector = ({
  type,
  onChange,
}: {
  onChange(type: AwsCredentialsType): void;
  type: AwsCredentialsType;
}) => (
  <EuiFormRow
    fullWidth
    label={i18n.translate('xpack.csp.awsIntegration.awsCredentialTypeSelectorLabel', {
      defaultMessage: 'Preferred manual method',
    })}
  >
    <EuiSelect
      fullWidth
      options={getAwsCredentialsFormManualOptions()}
      value={type}
      onChange={(optionElem) => {
        onChange(optionElem.target.value as AwsCredentialsType);
      }}
    />
  </EuiFormRow>
);
