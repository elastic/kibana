/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useEffect } from 'react';
import { EuiFieldText, EuiFormRow, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PackagePolicyReplaceDefineStepExtensionComponentProps } from '@kbn/fleet-plugin/public/types';
import { useParams } from 'react-router-dom';
import type { PostureInput, PosturePolicyTemplate } from '../../../common/types';
import { CLOUDBEAT_AWS, CLOUDBEAT_VANILLA } from '../../../common/constants';
import { getPosturePolicy, getEnabledPostureInput, getPostureInputHiddenVars } from './utils';
import {
  PolicyTemplateInfo,
  PolicyTemplateInputSelector,
  PolicyTemplateSelector,
  PolicyTemplateVarsForm,
} from './policy_template_selectors';

const DEFAULT_INPUT_TYPE = {
  kspm: CLOUDBEAT_VANILLA,
  cspm: CLOUDBEAT_AWS,
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
    const { integration } = useParams<{ integration: PosturePolicyTemplate }>();
    const input = getEnabledPostureInput(newPolicy);

    const updatePolicy = (updatedPolicy: NewPackagePolicy) =>
      onChange({ isValid: true, updatedPolicy });

    /**
     * - Updates policy inputs by user selection
     * - Updates hidden policy vars
     */
    const setEnabledPolicyInput = (inputType: PostureInput) => {
      const inputVars = getPostureInputHiddenVars(inputType);
      const policy = getPosturePolicy(newPolicy, inputType, inputVars);
      updatePolicy(policy);
    };

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

    useEffect(() => {
      if (isEditPage) return;

      // Pick default input type for policy template.
      // Only 1 enabled input is supported when all inputs are initially enabled.
      setEnabledPolicyInput(DEFAULT_INPUT_TYPE[input.policy_template]);

      // Required for mount only to ensure a single input type is selected
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditPage]);

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
