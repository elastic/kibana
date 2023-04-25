/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  NewPackagePolicyInput,
  PackagePolicyReplaceDefineStepExtensionComponentProps,
} from '@kbn/fleet-plugin/public/types';
import type { PackageInfo } from '@kbn/fleet-plugin/common';
import { useParams } from 'react-router-dom';
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
} from './utils';
import {
  PolicyTemplateInfo,
  PolicyTemplateInputSelector,
  PolicyTemplateSelector,
  PolicyTemplateVarsForm,
} from './policy_template_selectors';
import { assert } from '../../../common/utils/helpers';
import { useCspSetupStatusApi } from '../../common/api/use_setup_status_api';

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

    const input = getSelectedOption(newPolicy.inputs, integration);

    const updatePolicy = useCallback(
      (updatedPolicy: NewPackagePolicy) => onChange({ isValid: true, updatedPolicy }),
      [onChange]
    );
    /**
     * - Updates policy inputs by user selection
     * - Updates hidden policy vars
     */
    const setEnabledPolicyInput = useCallback(
      (inputType: PostureInput) => {
        const inputVars = getPostureInputHiddenVars(inputType);
        const policy = getPosturePolicy(newPolicy, inputType, inputVars);
        updatePolicy(policy);
      },
      [newPolicy, updatePolicy]
    );

    // search for non null fields of the validation?.vars object
    const validationResultsNonNullFields = Object.keys(validationResults?.vars || {}).filter(
      (key) => (validationResults?.vars || {})[key] !== null
    );

    const [isLoading, setIsLoading] = useState(validationResultsNonNullFields.length > 0);

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

    useEffect(() => {
      if (isEditPage) return;
      if (isLoading) return;
      // Pick default input type for policy template.
      // Only 1 enabled input is supported when all inputs are initially enabled.
      // Required for mount only to ensure a single input type is selected
      // This will remove errors in validationResults.vars
      setEnabledPolicyInput(DEFAULT_INPUT_TYPE[input.policy_template]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading, input.policy_template, isEditPage]);

    usePolicyTemplateInitialName({
      isEditPage,
      isLoading,
      integration,
      newPolicy,
      updatePolicy,
    });

    useEnsureDefaultNamespace({ newPolicy, input, updatePolicy });

    useCloudFormationTemplate({
      packageInfo,
      updatePolicy,
      newPolicy,
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
      <div data-test-subj={'test'}>
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
        {/* Defines the name/description */}
        <IntegrationSettings
          fields={integrationFields}
          onChange={(field, value) => updatePolicy({ ...newPolicy, [field]: value })}
        />
        {/* Defines the vars of the enabled input of the active policy template */}
        <PolicyTemplateVarsForm input={input} newPolicy={newPolicy} updatePolicy={updatePolicy} />
        <EuiSpacer />
      </div>
    );
  }
);

CspPolicyTemplateForm.displayName = 'CspPolicyTemplateForm';

// eslint-disable-next-line import/no-default-export
export { CspPolicyTemplateForm as default };

const usePolicyTemplateInitialName = ({
  isEditPage,
  isLoading,
  integration,
  newPolicy,
  updatePolicy,
}: {
  isEditPage: boolean;
  isLoading: boolean;
  integration: CloudSecurityPolicyTemplate | undefined;
  newPolicy: NewPackagePolicy;
  updatePolicy: (policy: NewPackagePolicy) => void;
}) => {
  const getSetupStatus = useCspSetupStatusApi();
  const installedPackagePolicyCount = Object.entries(getSetupStatus?.data ?? {})?.find(
    ([key, _value]) => key === integration
  )?.[1]?.installedPackagePolicies;

  const currentPackagePolicyCount =
    typeof installedPackagePolicyCount === 'number' ? installedPackagePolicyCount + 1 : undefined;

  useEffect(() => {
    if (!integration) return;
    if (isEditPage) return;
    if (isLoading) return;

    const sequenceSuffix = currentPackagePolicyCount ? `-${currentPackagePolicyCount}` : '';
    const currentIntegrationName = `${integration}${sequenceSuffix}`;
    if (newPolicy.name === currentIntegrationName) {
      return;
    }
    updatePolicy({
      ...newPolicy,
      name: currentIntegrationName,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, integration, isEditPage]);
};

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
