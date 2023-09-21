/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiLink, EuiSpacer, EuiText, EuiTitle, EuiCallOut, EuiHorizontalRule } from '@elastic/eui';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { NewPackagePolicyInput, PackageInfo } from '@kbn/fleet-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { DEFAULT_MANUAL_AZURE_CREDENTIALS_TYPE } from './get_aws_credentials_form_options';
import { RadioGroup } from '../csp_boxed_radio_group';
import { NewPackagePolicyPostureInput } from '../utils';
import { SetupFormat, useAwsCredentialsForm } from './hooks';

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
          defaultMessage="Utilize an Azure Resource Manager (ARM) template (a built-in Azure IaC tool) or a series of manual steps to set up and deploy CSPM for assessing your Azure environment's security posture. Refer to our {gettingStartedLink} for details."
          values={{
            gettingStartedLink: (
              <EuiLink href={integrationLink} target="_blank">
                <FormattedMessage
                  id="xpack.csp.awsIntegration.gettingStarted.setupInfoContentLink"
                  defaultMessage="Getting Started guide"
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
    id: 'arm_template',
    label: 'ARM Template',
  },
  {
    id: 'manual',
    label: i18n.translate('xpack.csp.azureIntegration.setupFormatOptions.manual', {
      defaultMessage: 'Manual',
    }),
    disabled: true,
    tooltip: i18n.translate(
      'xpack.csp.azureIntegration.setupFormatOptions.manual.disabledTooltip',
      { defaultMessage: 'Coming soon' }
    ),
  },
];

interface Props {
  newPolicy: NewPackagePolicy;
  input: Extract<NewPackagePolicyPostureInput, { type: 'cloudbeat/cis_aws' }>;
  updatePolicy(updatedPolicy: NewPackagePolicy): void;
  packageInfo: PackageInfo;
  onChange: any;
  setIsValid: (isValid: boolean) => void;
}

// TODO: get link from tin
const ARM_TEMPLATE_EXTERNAL_DOC_URL =
  'https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/';

const ArmTemplateSetup = ({
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
          id="xpack.csp.azureIntegration.armTemplateSetupStep.notSupported"
          defaultMessage="ARM Template is not supported on the current Integration version, please upgrade your integration to the latest version to use ARM Template"
        />
      </EuiCallOut>
    );
  }

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
              id="xpack.csp.azureIntegration.armTemplateSetupStep.login"
              defaultMessage="Log in to your Azure portal."
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.csp.azureIntegration.armTemplateSetupStep.save"
              defaultMessage="Click the Save tand continue button on the bottom right of this page."
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.csp.azureIntegration.armTemplateSetupStep.launch"
              defaultMessage="On the subsequent pop-up modal, copy the relevant Bash command, then click on the Launch ARM Template button."
            />
          </li>
        </ol>
      </EuiText>
      <EuiSpacer size="l" />
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="xpack.csp.azureIntegration.armTemplateSetupNote"
          defaultMessage="Read the {documentation} for more details"
          values={{
            documentation: (
              <EuiLink
                href={ARM_TEMPLATE_EXTERNAL_DOC_URL}
                target="_blank"
                rel="noopener nofollow noreferrer"
                data-test-subj="externalLink"
              >
                {i18n.translate('xpack.csp.azureIntegration.documentationLinkText', {
                  defaultMessage: 'documentation',
                })}
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </>
  );
};

export const AzureCredentialsForm = ({
  input,
  newPolicy,
  updatePolicy,
  packageInfo,
  onChange,
  setIsValid,
}: Props) => {
  const { setupFormat, integrationLink, hasCloudFormationTemplate, onSetupFormatChange } =
    useAwsCredentialsForm({
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
        size="m"
        options={getSetupFormatOptions()}
        idSelected={DEFAULT_MANUAL_AZURE_CREDENTIALS_TYPE}
        onChange={(idSelected: SetupFormat) =>
          idSelected !== setupFormat && onSetupFormatChange(idSelected)
        }
      />
      <EuiSpacer size="l" />
      {setupFormat === 'arm_template' && (
        <ArmTemplateSetup hasCloudFormationTemplate={hasCloudFormationTemplate} input={input} />
      )}
      <EuiSpacer />
    </>
  );
};
