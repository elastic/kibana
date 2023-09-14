/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import semverCompare from 'semver/functions/compare';
import semverValid from 'semver/functions/valid';
import {
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  NewPackagePolicyInput,
  PackagePolicyReplaceDefineStepExtensionComponentProps,
} from '@kbn/fleet-plugin/public/types';
import { PackageInfo, PackagePolicy } from '@kbn/fleet-plugin/common';
import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { CspRadioGroupProps, RadioGroup } from './csp_boxed_radio_group';
import { assert } from '../../../common/utils/helpers';
import type { PostureInput, CloudSecurityPolicyTemplate } from '../../../common/types';
import {
  CLOUDBEAT_AWS,
  CLOUDBEAT_VANILLA,
  CLOUDBEAT_VULN_MGMT_AWS,
  CSPM_POLICY_TEMPLATE,
  SUPPORTED_POLICY_TEMPLATES,
} from '../../../common/constants';
import {
  getPosturePolicy,
  getPostureInputHiddenVars,
  getVulnMgmtCloudFormationDefaultValue,
  POSTURE_NAMESPACE,
  type NewPackagePolicyPostureInput,
  isPostureInput,
  getMaxPackageName,
} from './utils';
import {
  PolicyTemplateInfo,
  PolicyTemplateInputSelector,
  PolicyTemplateSelector,
  PolicyTemplateVarsForm,
} from './policy_template_selectors';
import { usePackagePolicyList } from '../../common/api/use_package_policy_list';

const DEFAULT_INPUT_TYPE = {
  kspm: CLOUDBEAT_VANILLA,
  cspm: CLOUDBEAT_AWS,
  vuln_mgmt: CLOUDBEAT_VULN_MGMT_AWS,
} as const;

const EditScreenStepTitle = () => (
  <>
    <EuiTitle size="s">
      <h4>
        <FormattedMessage
          id="xpack.csp.fleetIntegration.integrationSettingsTitle"
          defaultMessage="Integration Settings"
        />
      </h4>
    </EuiTitle>
    <EuiSpacer />
  </>
);

interface IntegrationInfoFieldsProps {
  fields: Array<{ id: string; value: string; label: React.ReactNode; error: string[] | null }>;
  onChange(field: string, value: string): void;
}

export const AWS_SINGLE_ACCOUNT = 'single-account';
export const AWS_ORGANIZATION_ACCOUNT = 'organization-account';
export const GCP_SINGLE_ACCOUNT = 'single-account-gcp';
export const GCP_ORGANIZATION_ACCOUNT = 'organization-account-gcp';
type AwsAccountType = typeof AWS_SINGLE_ACCOUNT | typeof AWS_ORGANIZATION_ACCOUNT;

const getAwsAccountTypeOptions = (isAwsOrgDisabled: boolean): CspRadioGroupProps['options'] => [
  {
    id: AWS_ORGANIZATION_ACCOUNT,
    label: i18n.translate('xpack.csp.fleetIntegration.awsAccountType.awsOrganizationLabel', {
      defaultMessage: 'AWS Organization',
    }),
    disabled: isAwsOrgDisabled,
    tooltip: isAwsOrgDisabled
      ? i18n.translate('xpack.csp.fleetIntegration.awsAccountType.awsOrganizationDisabledTooltip', {
          defaultMessage: 'Supported from integration version 1.5.0 and above',
        })
      : undefined,
  },
  {
    id: AWS_SINGLE_ACCOUNT,
    label: i18n.translate('xpack.csp.fleetIntegration.awsAccountType.singleAccountLabel', {
      defaultMessage: 'Single Account',
    }),
  },
];

const getGcpAccountTypeOptions = (): CspRadioGroupProps['options'] => [
  {
    id: GCP_ORGANIZATION_ACCOUNT,
    label: i18n.translate('xpack.csp.fleetIntegration.gcpAccountType.gcpOrganizationLabel', {
      defaultMessage: 'GCP Organization',
    }),
    disabled: true,
    tooltip: i18n.translate(
      'xpack.csp.fleetIntegration.gcpAccountType.gcpOrganizationDisabledTooltip',
      {
        defaultMessage: 'Coming Soon',
      }
    ),
  },
  {
    id: GCP_SINGLE_ACCOUNT,
    label: i18n.translate('xpack.csp.fleetIntegration.gcpAccountType.gcpSingleAccountLabel', {
      defaultMessage: 'Single Account',
    }),
  },
];

const getAwsAccountType = (
  input: Extract<NewPackagePolicyPostureInput, { type: 'cloudbeat/cis_aws' }>
): AwsAccountType | undefined => input.streams[0].vars?.['aws.account_type']?.value;

const AWS_ORG_MINIMUM_PACKAGE_VERSION = '1.5.0-preview20';

const AwsAccountTypeSelect = ({
  input,
  newPolicy,
  updatePolicy,
  packageInfo,
}: {
  input: Extract<NewPackagePolicyPostureInput, { type: 'cloudbeat/cis_aws' }>;
  newPolicy: NewPackagePolicy;
  updatePolicy: (updatedPolicy: NewPackagePolicy) => void;
  packageInfo: PackageInfo;
}) => {
  // This will disable the aws org option for any version below 1.5.0-preview20 which introduced support for account_type. https://github.com/elastic/integrations/pull/6682
  const isValidSemantic = semverValid(packageInfo.version);
  const isAwsOrgDisabled = isValidSemantic
    ? semverCompare(packageInfo.version, AWS_ORG_MINIMUM_PACKAGE_VERSION) < 0
    : true;

  const awsAccountTypeOptions = useMemo(
    () => getAwsAccountTypeOptions(isAwsOrgDisabled),
    [isAwsOrgDisabled]
  );

  useEffect(() => {
    if (!getAwsAccountType(input)) {
      updatePolicy(
        getPosturePolicy(newPolicy, input.type, {
          'aws.account_type': {
            value: isAwsOrgDisabled ? AWS_SINGLE_ACCOUNT : AWS_ORGANIZATION_ACCOUNT,
            type: 'text',
          },
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  return (
    <>
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="xpack.csp.fleetIntegration.awsAccountTypeDescriptionLabel"
          defaultMessage="Select between single account or organization, and then fill in the name and description to help identify this integration."
        />
      </EuiText>
      <EuiSpacer size="l" />
      {isAwsOrgDisabled && (
        <>
          <EuiCallOut color="warning">
            <FormattedMessage
              id="xpack.csp.fleetIntegration.awsAccountType.awsOrganizationNotSupportedMessage"
              defaultMessage="AWS Organization not supported in current integration version. Please upgrade to the latest version to enable AWS Organizations integration."
            />
          </EuiCallOut>
          <EuiSpacer size="l" />
        </>
      )}
      <RadioGroup
        idSelected={getAwsAccountType(input) || ''}
        options={awsAccountTypeOptions}
        onChange={(accountType) => {
          updatePolicy(
            getPosturePolicy(newPolicy, input.type, {
              'aws.account_type': {
                value: accountType,
                type: 'text',
              },
            })
          );
        }}
        size="m"
      />
      {getAwsAccountType(input) === AWS_ORGANIZATION_ACCOUNT && (
        <>
          <EuiSpacer size="l" />
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="xpack.csp.fleetIntegration.awsAccountType.awsOrganizationDescription"
              defaultMessage="Connect Elastic to every AWS Account (current and future) in your environment by providing Elastic with read-only (configuration) access to your AWS organization."
            />
          </EuiText>
        </>
      )}
      {getAwsAccountType(input) === AWS_SINGLE_ACCOUNT && (
        <>
          <EuiSpacer size="l" />
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="xpack.csp.fleetIntegration.awsAccountType.singleAccountDescription"
              defaultMessage="Deploying to a single account is suitable for an initial POC. To ensure complete coverage, it is strongly recommended to deploy CSPM at the organization-level, which automatically connects all accounts (both current and future)."
            />
          </EuiText>
        </>
      )}
      <EuiSpacer size="l" />
    </>
  );
};

const GcpAccountTypeSelect = ({
  input,
  newPolicy,
  updatePolicy,
  packageInfo,
}: {
  input: Extract<NewPackagePolicyPostureInput, { type: 'cloudbeat/cis_gcp' }>;
  newPolicy: NewPackagePolicy;
  updatePolicy: (updatedPolicy: NewPackagePolicy) => void;
  packageInfo: PackageInfo;
}) => {
  return (
    <>
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="xpack.csp.fleetIntegration.gcpAccountTypeDescriptionLabel"
          defaultMessage="Select between single account or organization, and then fill in the name and description to help identify this integration."
        />
      </EuiText>
      <EuiSpacer size="l" />
      <RadioGroup
        idSelected={GCP_SINGLE_ACCOUNT}
        options={getGcpAccountTypeOptions()}
        onChange={(accountType) => {
          updatePolicy(
            getPosturePolicy(newPolicy, input.type, {
              gcp_account_type: {
                value: accountType,
                type: 'text',
              },
            })
          );
        }}
        size="m"
      />
      <EuiSpacer size="l" />
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="xpack.csp.fleetIntegration.gcpAccountType.singleAccountDescription"
          defaultMessage="Deploying to a single account is suitable for an initial POC. To ensure complete coverage, it is strongly recommended to deploy CSPM at the organization-level, which automatically connects all accounts (both current and future)."
        />
      </EuiText>
      <EuiSpacer size="l" />
    </>
  );
};

const IntegrationSettings = ({ onChange, fields }: IntegrationInfoFieldsProps) => (
  <div>
    {fields.map(({ value, id, label, error }) => (
      <EuiFormRow key={id} id={id} fullWidth label={label} isInvalid={!!error} error={error}>
        <EuiFieldText
          isInvalid={!!error}
          fullWidth
          value={value}
          onChange={(event) => onChange(id, event.target.value)}
        />
      </EuiFormRow>
    ))}
  </div>
);

export const CspPolicyTemplateForm = memo<PackagePolicyReplaceDefineStepExtensionComponentProps>(
  ({ newPolicy, onChange, validationResults, isEditPage, packageInfo }) => {
    const integrationParam = useParams<{ integration: CloudSecurityPolicyTemplate }>().integration;
    const integration = SUPPORTED_POLICY_TEMPLATES.includes(integrationParam)
      ? integrationParam
      : undefined;
    // Handling validation state
    const [isValid, setIsValid] = useState(true);
    const input = getSelectedOption(newPolicy.inputs, integration);

    const updatePolicy = useCallback(
      (updatedPolicy: NewPackagePolicy) => onChange({ isValid, updatedPolicy }),
      [onChange, isValid]
    );
    /**
     * - Updates policy inputs by user selection
     * - Updates hidden policy vars
     */
    const setEnabledPolicyInput = useCallback(
      (inputType: PostureInput) => {
        const inputVars = getPostureInputHiddenVars(inputType, packageInfo);
        const policy = getPosturePolicy(newPolicy, inputType, inputVars);
        updatePolicy(policy);
      },
      [newPolicy, updatePolicy, packageInfo]
    );

    // search for non null fields of the validation?.vars object
    const validationResultsNonNullFields = Object.keys(validationResults?.vars || {}).filter(
      (key) => (validationResults?.vars || {})[key] !== null
    );

    const [isLoading, setIsLoading] = useState(validationResultsNonNullFields.length > 0);
    const [canFetchIntegration, setCanFetchIntegration] = useState(true);

    // delaying component rendering due to a race condition issue from Fleet
    // TODO: remove this workaround when the following issue is resolved:
    // https://github.com/elastic/kibana/issues/153246
    useEffect(() => {
      // using validation?.vars to know if the newPolicy state was reset due to race condition
      if (validationResultsNonNullFields.length > 0) {
        // Forcing rerender to recover from the validation errors state
        setIsLoading(true);
      }
      setTimeout(() => setIsLoading(false), 200);
    }, [validationResultsNonNullFields]);

    const { data: packagePolicyList, refetch } = usePackagePolicyList(packageInfo.name, {
      enabled: canFetchIntegration,
    });

    useEffect(() => {
      if (isEditPage) return;
      if (isLoading) return;
      // Pick default input type for policy template.
      // Only 1 enabled input is supported when all inputs are initially enabled.
      // Required for mount only to ensure a single input type is selected
      // This will remove errors in validationResults.vars
      setEnabledPolicyInput(DEFAULT_INPUT_TYPE[input.policy_template]);
      refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading, input.policy_template, isEditPage]);

    useEnsureDefaultNamespace({ newPolicy, input, updatePolicy });

    useCloudFormationTemplate({
      packageInfo,
      updatePolicy,
      newPolicy,
    });

    usePolicyTemplateInitialName({
      packagePolicyList: packagePolicyList?.items,
      isEditPage,
      isLoading,
      integration,
      newPolicy,
      updatePolicy,
      setCanFetchIntegration,
    });

    if (isLoading) {
      return (
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    const integrationFields = [
      {
        id: 'name',
        value: newPolicy.name,
        error: validationResults?.name || null,
        label: (
          <FormattedMessage
            id="xpack.csp.fleetIntegration.integrationNameLabel"
            defaultMessage="Name"
          />
        ),
      },
      {
        id: 'description',
        value: newPolicy.description || '',
        error: validationResults?.description || null,
        label: (
          <FormattedMessage
            id="xpack.csp.fleetIntegration.integrationDescriptionLabel"
            defaultMessage="Description"
          />
        ),
      },
    ];

    return (
      <>
        {isEditPage && <EditScreenStepTitle />}
        {/* Defines the enabled policy template */}
        {!integration && (
          <>
            <PolicyTemplateSelector
              selectedTemplate={input.policy_template}
              policy={newPolicy}
              setPolicyTemplate={(template) => setEnabledPolicyInput(DEFAULT_INPUT_TYPE[template])}
              disabled={isEditPage}
            />
            <EuiSpacer size="l" />
          </>
        )}
        {/* Shows info on the active policy template */}
        <PolicyTemplateInfo postureType={input.policy_template} />
        <EuiSpacer size="l" />
        {/* Defines the single enabled input of the active policy template */}
        <PolicyTemplateInputSelector
          input={input}
          setInput={setEnabledPolicyInput}
          disabled={isEditPage}
        />
        <EuiSpacer size="l" />

        {/* AWS account type selection box */}
        {input.type === 'cloudbeat/cis_aws' && (
          <AwsAccountTypeSelect
            input={input}
            newPolicy={newPolicy}
            updatePolicy={updatePolicy}
            packageInfo={packageInfo}
          />
        )}

        {input.type === 'cloudbeat/cis_gcp' && (
          <GcpAccountTypeSelect
            input={input}
            newPolicy={newPolicy}
            updatePolicy={updatePolicy}
            packageInfo={packageInfo}
          />
        )}

        {/* Defines the name/description */}
        <IntegrationSettings
          fields={integrationFields}
          onChange={(field, value) => updatePolicy({ ...newPolicy, [field]: value })}
        />
        {/* Defines the vars of the enabled input of the active policy template */}
        <PolicyTemplateVarsForm
          input={input}
          newPolicy={newPolicy}
          updatePolicy={updatePolicy}
          packageInfo={packageInfo}
          onChange={onChange}
          setIsValid={setIsValid}
        />
        <EuiSpacer />
      </>
    );
  }
);

CspPolicyTemplateForm.displayName = 'CspPolicyTemplateForm';

// eslint-disable-next-line import/no-default-export
export { CspPolicyTemplateForm as default };

const useEnsureDefaultNamespace = ({
  newPolicy,
  input,
  updatePolicy,
}: {
  newPolicy: NewPackagePolicy;
  input: NewPackagePolicyPostureInput;
  updatePolicy: (policy: NewPackagePolicy) => void;
}) => {
  useEffect(() => {
    if (newPolicy.namespace === POSTURE_NAMESPACE) return;

    const policy = { ...getPosturePolicy(newPolicy, input.type), namespace: POSTURE_NAMESPACE };
    updatePolicy(policy);
  }, [newPolicy, input, updatePolicy]);
};

const usePolicyTemplateInitialName = ({
  isEditPage,
  isLoading,
  integration,
  newPolicy,
  packagePolicyList,
  updatePolicy,
  setCanFetchIntegration,
}: {
  isEditPage: boolean;
  isLoading: boolean;
  integration: CloudSecurityPolicyTemplate | undefined;
  newPolicy: NewPackagePolicy;
  packagePolicyList: PackagePolicy[] | undefined;
  updatePolicy: (policy: NewPackagePolicy) => void;
  setCanFetchIntegration: (canFetch: boolean) => void;
}) => {
  useEffect(() => {
    if (!integration) return;
    if (isEditPage) return;
    if (isLoading) return;

    const packagePolicyListByIntegration = packagePolicyList?.filter(
      (policy) => policy?.vars?.posture?.value === integration
    );

    const currentIntegrationName = getMaxPackageName(integration, packagePolicyListByIntegration);

    if (newPolicy.name === currentIntegrationName) {
      return;
    }

    updatePolicy({
      ...newPolicy,
      name: currentIntegrationName,
    });
    setCanFetchIntegration(false);
    // since this useEffect should only run on initial mount updatePolicy and newPolicy shouldn't re-trigger it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, integration, isEditPage, packagePolicyList]);
};

const getSelectedOption = (
  options: NewPackagePolicyInput[],
  policyTemplate: string = CSPM_POLICY_TEMPLATE
) => {
  // Looks for the enabled deployment (aka input). By default, all inputs are disabled.
  // Initial state when all inputs are disabled is to choose the first available of the relevant policyTemplate
  // Default selected policy template is CSPM
  const selectedOption =
    options.find((i) => i.enabled) ||
    options.find((i) => i.policy_template === policyTemplate) ||
    options[0];

  assert(selectedOption, 'Failed to determine selected option'); // We can't provide a default input without knowing the policy template
  assert(isPostureInput(selectedOption), 'Unknown option: ' + selectedOption.type);

  return selectedOption;
};

/**
 * Update CloudFormation template and stack name in the Agent Policy
 * based on the selected policy template
 */
const useCloudFormationTemplate = ({
  packageInfo,
  newPolicy,
  updatePolicy,
}: {
  packageInfo: PackageInfo;
  newPolicy: NewPackagePolicy;
  updatePolicy: (policy: NewPackagePolicy) => void;
}) => {
  useEffect(() => {
    const templateUrl = getVulnMgmtCloudFormationDefaultValue(packageInfo);

    // If the template is not available, do not update the policy
    if (templateUrl === '') return;

    const checkCurrentTemplate = newPolicy?.inputs?.find(
      (i: any) => i.type === CLOUDBEAT_VULN_MGMT_AWS
    )?.config?.cloud_formation_template_url?.value;

    // If the template is already set, do not update the policy
    if (checkCurrentTemplate === templateUrl) return;

    updatePolicy?.({
      ...newPolicy,
      inputs: newPolicy.inputs.map((input) => {
        if (input.type === CLOUDBEAT_VULN_MGMT_AWS) {
          return {
            ...input,
            config: { cloud_formation_template_url: { value: templateUrl } },
          };
        }
        return input;
      }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newPolicy?.vars?.cloud_formation_template_url, newPolicy, packageInfo]);
};
