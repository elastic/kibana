/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { EuiLink, EuiSpacer, EuiText, EuiTitle, EuiCallOut, EuiHorizontalRule } from '@elastic/eui';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { NewPackagePolicyInput, PackageInfo } from '@kbn/fleet-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import semverValid from 'semver/functions/valid';
import semverCoerce from 'semver/functions/coerce';
import semverLt from 'semver/functions/lt';
import { SetupFormat, useAzureCredentialsForm } from './hooks';
import { NewPackagePolicyPostureInput } from '../utils';
import { CspRadioOption, RadioGroup } from '../csp_boxed_radio_group';

interface AzureSetupInfoContentProps {
  integrationLink: string;
}

export const AZURE_ARM_TEMPLATE_CREDENTIAL_TYPE = 'arm_template';
export const AZURE_MANUAL_CREDENTIAL_TYPE = 'manual';

const AzureSetupInfoContent = ({ integrationLink }: AzureSetupInfoContentProps) => {
  return (
    <>
      <EuiHorizontalRule margin="xl" />
      <EuiTitle size="xs">
        <h2>
          <FormattedMessage
            id="xpack.csp.azureIntegration.setupInfoContentTitle"
            defaultMessage="Setup Access"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="l" />
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="xpack.csp.azureIntegration.gettingStarted.setupInfoContent"
          defaultMessage="Utilize an Azure Resource Manager (ARM) template (a built-in Azure IaC tool) or a series of manual steps to set up and deploy CSPM for assessing your Azure environment's security posture. Refer to our {gettingStartedLink} for details."
          values={{
            gettingStartedLink: (
              <EuiLink href={integrationLink} target="_blank">
                <FormattedMessage
                  id="xpack.csp.azureIntegration.gettingStarted.setupInfoContentLink"
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

const getSetupFormatOptions = (): CspRadioOption[] => [
  {
    id: AZURE_ARM_TEMPLATE_CREDENTIAL_TYPE,
    label: 'ARM Template',
  },
  {
    id: AZURE_MANUAL_CREDENTIAL_TYPE,
    label: i18n.translate('xpack.csp.azureIntegration.setupFormatOptions.manual', {
      defaultMessage: 'Manual',
    }),
  },
];

interface Props {
  newPolicy: NewPackagePolicy;
  input: Extract<NewPackagePolicyPostureInput, { type: 'cloudbeat/cis_azure' }>;
  updatePolicy(updatedPolicy: NewPackagePolicy): void;
  packageInfo: PackageInfo;
  onChange: any;
  setIsValid: (isValid: boolean) => void;
  disabled: boolean;
}

const ARM_TEMPLATE_EXTERNAL_DOC_URL =
  'https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/';

const ArmTemplateSetup = ({
  hasArmTemplateUrl,
  input,
}: {
  hasArmTemplateUrl: boolean;
  input: NewPackagePolicyInput;
}) => {
  if (!hasArmTemplateUrl) {
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
      <EuiText color="text" size="s">
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
              defaultMessage="Click the Save and continue button on the bottom right of this page."
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

const ManualSetup = ({ integrationLink }: { integrationLink: string }) => {
  return (
    <>
      <EuiText color="text" size="s">
        <FormattedMessage
          id="xpack.csp.azureIntegration.manualCredentialType.instructions"
          defaultMessage="Ensure the agent is deployed on a resource that supports managed identities (e.g., Azure Virtual Machines). No explicit credentials need to be provided; Azure handles the authentication. Refer to our {gettingStartedLink} for details."
          values={{
            gettingStartedLink: (
              <EuiLink href={integrationLink} target="_blank">
                <FormattedMessage
                  id="xpack.csp.azureIntegration.gettingStarted.setupInfoContentLink"
                  defaultMessage="Getting Started guide"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
      <EuiSpacer />
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="xpack.csp.azureIntegration.manualCredentialType.documentaion"
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

const AZURE_MINIMUM_PACKAGE_VERSION = '1.6.0';

export const AzureCredentialsForm = ({
  input,
  newPolicy,
  updatePolicy,
  packageInfo,
  onChange,
  setIsValid,
  disabled,
}: Props) => {
  const { setupFormat, onSetupFormatChange, integrationLink, hasArmTemplateUrl } =
    useAzureCredentialsForm({
      newPolicy,
      input,
      packageInfo,
      onChange,
      setIsValid,
      updatePolicy,
    });

  useEffect(() => {
    if (!setupFormat) {
      onSetupFormatChange(AZURE_ARM_TEMPLATE_CREDENTIAL_TYPE);
    }
  }, [setupFormat, onSetupFormatChange]);

  const packageSemanticVersion = semverValid(packageInfo.version);
  const cleanPackageVersion = semverCoerce(packageSemanticVersion) || '';
  const isPackageVersionValidForAzure = !semverLt(
    cleanPackageVersion,
    AZURE_MINIMUM_PACKAGE_VERSION
  );

  useEffect(() => {
    setIsValid(isPackageVersionValidForAzure);

    onChange({
      isValid: isPackageVersionValidForAzure,
      updatedPolicy: newPolicy,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, packageInfo, setupFormat]);

  if (!isPackageVersionValidForAzure) {
    return (
      <>
        <EuiSpacer size="l" />
        <EuiCallOut color="warning">
          <FormattedMessage
            id="xpack.csp.azureIntegration.azureNotSupportedMessage"
            defaultMessage="CIS Azure is not supported on the current Integration version, please upgrade your integration to the latest version to use CIS Azure"
          />
        </EuiCallOut>
      </>
    );
  }

  return (
    <>
      <AzureSetupInfoContent integrationLink={integrationLink} />
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
      {setupFormat === AZURE_ARM_TEMPLATE_CREDENTIAL_TYPE && (
        <ArmTemplateSetup hasArmTemplateUrl={hasArmTemplateUrl} input={input} />
      )}
      {setupFormat === AZURE_MANUAL_CREDENTIAL_TYPE && (
        <ManualSetup integrationLink={integrationLink} />
      )}
      <EuiSpacer />
    </>
  );
};
