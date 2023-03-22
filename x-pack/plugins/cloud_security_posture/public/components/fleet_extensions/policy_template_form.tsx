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
  ({ newPolicy, onChange, validationResults, isEditPage }) => {
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

    const [loading, setLoading] = useState(validationResultsNonNullFields.length > 0);

    // delaying component rendering due to a race condition issue from Fleet
    // TODO: remove this workaround when the following issue is resolved:
    // https://github.com/elastic/kibana/issues/153246
    useEffect(() => {
      // using validation?.vars to know if the newPolicy state was reset due to race condition
      if (validationResultsNonNullFields.length > 0) {
        // Forcing rerender to recover from the validation errors state
        setLoading(true);
      }
      setTimeout(() => setLoading(false), 200);
    }, [validationResultsNonNullFields]);

    useEffect(() => {
      if (isEditPage) return;
      if (loading) return;
      // Pick default input type for policy template.
      // Only 1 enabled input is supported when all inputs are initially enabled.
      // Required for mount only to ensure a single input type is selected
      // This will remove errors in validationResults.vars
      setEnabledPolicyInput(DEFAULT_INPUT_TYPE[input.policy_template]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, input.policy_template, isEditPage]);

    useEnsureDefaultNamespace({ newPolicy, input, updatePolicy });

    if (loading) {
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
      <div>
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
