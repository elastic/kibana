/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import {
  EuiCallOut,
  EuiFieldPassword,
  EuiFieldText,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { NewPackagePolicyInput, PackageInfo } from '@kbn/fleet-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import semverValid from 'semver/functions/valid';
import semverCoerce from 'semver/functions/coerce';
import semverLt from 'semver/functions/lt';
import {
  AzureOptions,
  getAzureCredentialsFormManualOptions,
} from './get_azure_credentials_form_options';
import { AzureCredentialsType } from '../../../../common/types_old';
import { useAzureCredentialsForm } from './hooks';
import { getPosturePolicy, NewPackagePolicyPostureInput } from '../utils';
import { CspRadioOption, RadioGroup } from '../csp_boxed_radio_group';
import { CIS_AZURE_SETUP_FORMAT_TEST_SUBJECTS } from '../../test_subjects';

interface AzureSetupInfoContentProps {
  integrationLink: string;
}

export type SetupFormat = typeof AZURE_SETUP_FORMAT.ARM_TEMPLATE | typeof AZURE_SETUP_FORMAT.MANUAL;

export const AZURE_SETUP_FORMAT = {
  ARM_TEMPLATE: 'arm_template',
  MANUAL: 'manual',
};

export const AZURE_CREDENTIALS_TYPE = {
  ARM_TEMPLATE: 'arm_template',
  MANUAL: 'manual',
  SERVICE_PRINCIPAL_WITH_CLIENT_SECRET: 'service_principal_with_client_secret',
  SERVICE_PRINCIPAL_WITH_CLIENT_CERTIFICATE: 'service_principal_with_client_certificate',
  SERVICE_PRINCIPAL_WITH_CLIENT_USERNAME_AND_PASSWORD:
    'service_principal_with_client_username_and_password',
  MANAGED_IDENTITY: 'managed_identity',
} as const;

export const AzureSetupInfoContent = ({ integrationLink }: AzureSetupInfoContentProps) => {
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
    id: AZURE_SETUP_FORMAT.ARM_TEMPLATE,
    label: 'ARM Template',
    testId: CIS_AZURE_SETUP_FORMAT_TEST_SUBJECTS.ARM_TEMPLATE,
  },
  {
    id: AZURE_SETUP_FORMAT.MANUAL,
    label: i18n.translate('xpack.csp.azureIntegration.setupFormatOptions.manual', {
      defaultMessage: 'Manual',
    }),
    testId: CIS_AZURE_SETUP_FORMAT_TEST_SUBJECTS.MANUAL,
  },
];

export interface AzureCredentialsFormProps {
  newPolicy: NewPackagePolicy;
  input: Extract<NewPackagePolicyPostureInput, { type: 'cloudbeat/cis_azure' }>;
  updatePolicy(updatedPolicy: NewPackagePolicy): void;
  packageInfo: PackageInfo;
  onChange: any;
  setIsValid: (isValid: boolean) => void;
  disabled: boolean;
}

export const ARM_TEMPLATE_EXTERNAL_DOC_URL =
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
      <EuiText color="subdued" size="s">
        <ol
          css={css`
            list-style: auto;
          `}
        >
          <li>
            <FormattedMessage
              id="xpack.csp.azureIntegration.armTemplateSetupStep.hostRequirement"
              defaultMessage='Ensure "New hosts" is selected in the "Where to add this integration?" section below'
            />
          </li>
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

const AzureCredentialTypeSelector = ({
  type,
  onChange,
}: {
  onChange(type: AzureCredentialsType): void;
  type: AzureCredentialsType;
}) => (
  <EuiFormRow
    fullWidth
    label={i18n.translate('xpack.csp.azureIntegration.azureCredentialTypeSelectorLabel', {
      defaultMessage: 'Preferred manual method',
    })}
  >
    <EuiSelect
      fullWidth
      options={getAzureCredentialsFormManualOptions()}
      value={type}
      onChange={(optionElem) => {
        onChange(optionElem.target.value as AzureCredentialsType);
      }}
    />
  </EuiFormRow>
);

const TemporaryManualSetup = ({ integrationLink }: { integrationLink: string }) => {
  return (
    <>
      <EuiText color="subdued" size="s">
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
const AZURE_MANUAL_FIELDS_PACKAGE_VERSION = '1.7.0';

export const AzureInputVarFields = ({
  fields,
  onChange,
}: {
  fields: Array<AzureOptions[keyof AzureOptions]['fields'][number] & { value: string; id: string }>;
  onChange: (key: string, value: string) => void;
}) => (
  <div>
    {fields.map((field) => (
      <EuiFormRow key={field.id} label={field.label} fullWidth hasChildLabel={true} id={field.id}>
        <>
          {field.type === 'password' && (
            <EuiFieldPassword
              id={field.id}
              type="dual"
              fullWidth
              value={field.value || ''}
              onChange={(event) => onChange(field.id, event.target.value)}
              data-test-subj={field.testSubj}
            />
          )}
          {field.type === 'text' && (
            <EuiFieldText
              id={field.id}
              fullWidth
              value={field.value || ''}
              onChange={(event) => onChange(field.id, event.target.value)}
              data-test-subj={field.testSubj}
            />
          )}
        </>
      </EuiFormRow>
    ))}
  </div>
);

export const AzureCredentialsForm = ({
  input,
  newPolicy,
  updatePolicy,
  packageInfo,
  onChange,
  setIsValid,
  disabled,
}: AzureCredentialsFormProps) => {
  const {
    group,
    fields,
    azureCredentialsType,
    setupFormat,
    onSetupFormatChange,
    integrationLink,
    hasArmTemplateUrl,
  } = useAzureCredentialsForm({
    newPolicy,
    input,
    packageInfo,
    onChange,
    setIsValid,
    updatePolicy,
  });

  useEffect(() => {
    if (!setupFormat) {
      onSetupFormatChange(AZURE_SETUP_FORMAT.ARM_TEMPLATE);
    }
  }, [setupFormat, onSetupFormatChange]);

  const packageSemanticVersion = semverValid(packageInfo.version);
  const cleanPackageVersion = semverCoerce(packageSemanticVersion) || '';
  const isPackageVersionValidForAzure = !semverLt(
    cleanPackageVersion,
    AZURE_MINIMUM_PACKAGE_VERSION
  );
  const isPackageVersionValidForManualFields = !semverLt(
    cleanPackageVersion,
    AZURE_MANUAL_FIELDS_PACKAGE_VERSION
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
      {setupFormat === AZURE_SETUP_FORMAT.ARM_TEMPLATE && (
        <ArmTemplateSetup hasArmTemplateUrl={hasArmTemplateUrl} input={input} />
      )}
      {setupFormat === AZURE_SETUP_FORMAT.MANUAL && !isPackageVersionValidForManualFields && (
        <TemporaryManualSetup integrationLink={integrationLink} />
      )}
      {setupFormat === AZURE_SETUP_FORMAT.MANUAL && isPackageVersionValidForManualFields && (
        <>
          <AzureCredentialTypeSelector
            type={azureCredentialsType}
            onChange={(optionId) => {
              updatePolicy(
                getPosturePolicy(newPolicy, input.type, {
                  'azure.credentials.type': { value: optionId },
                })
              );
            }}
          />
          <EuiSpacer size="m" />
          <AzureInputVarFields
            fields={fields}
            onChange={(key, value) => {
              updatePolicy(getPosturePolicy(newPolicy, input.type, { [key]: { value } }));
            }}
          />
          <EuiSpacer size="m" />
          {group.info}
          <EuiSpacer size="m" />
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
      )}
      <EuiSpacer />
    </>
  );
};
