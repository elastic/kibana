/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useEffect } from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import type {
  NewPackagePolicy,
  PackagePolicyCreateExtensionComponentProps,
} from '@kbn/fleet-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PostureInput } from '../../../common/types';
import { CLOUDBEAT_AWS, CLOUDBEAT_VANILLA } from '../../../common/constants';
import { getPosturePolicy, getEnabledPostureInput, getPostureInputHiddenVars } from './utils';
import {
  PolicyTemplateInfo,
  PolicyTemplateInputSelector,
  PolicyTemplateVarsForm,
} from './policy_template_selectors';
import { IntegrationSettings } from './integration_settings';

const DEFAULT_INPUT_TYPE = {
  kspm: CLOUDBEAT_VANILLA,
  cspm: CLOUDBEAT_AWS,
} as const;

interface Props extends PackagePolicyCreateExtensionComponentProps {
  edit?: boolean;
}

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

export const CspPolicyTemplateForm = memo<Props>(({ newPolicy, onChange, edit }) => {
  const input = getEnabledPostureInput(newPolicy);

  const updatePolicy = (updatedPolicy: NewPackagePolicy) =>
    onChange({
      isValid: true,
      updatedPolicy,
    });

  /**
   * - Updates policy inputs by user selection
   * - Updates hidden policy vars
   */
  const setEnabledPolicyInput = (inputType: PostureInput) => {
    const inputVars = getPostureInputHiddenVars(inputType);
    const policy = getPosturePolicy(newPolicy, inputType, inputVars);
    updatePolicy(policy);
  };

  useEffect(() => {
    if (edit) return;

    // Pick default input type for policy template.
    // Only 1 enabled input is supported when all inputs are initially enabled.
    setEnabledPolicyInput(DEFAULT_INPUT_TYPE[input.policy_template]);

    // Required for mount only to ensure a single input type is selected
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit]);

  return (
    <div>
      {!!edit && <EditScreenStepTitle />}

      {/* Shows info on the active policy template */}
      <PolicyTemplateInfo postureType={input.policy_template} />
      <EuiSpacer size="l" />

      {/* Defines the single enabled input of the active policy template */}
      <PolicyTemplateInputSelector
        input={input}
        setInput={setEnabledPolicyInput}
        disabled={!!edit}
      />
      <EuiSpacer size="l" />

      {/* Defines the name/description */}
      <IntegrationSettings
        name={newPolicy.name}
        description={newPolicy.description || ''}
        onChange={(field, value) => updatePolicy({ ...newPolicy, [field]: value })}
      />
      {/* Defines the vars of the enabled input of the active policy template */}
      <PolicyTemplateVarsForm input={input} newPolicy={newPolicy} updatePolicy={updatePolicy} />
      <EuiSpacer />
    </div>
  );
});
