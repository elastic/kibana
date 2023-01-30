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
import { getPosturePolicy, getEnabledPostureInput } from './utils';
import { DEFAULT_AWS_VARS_GROUP } from './aws_credentials_form';
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
    <EuiTitle size="xs">
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

// Required package vars that are hidden from the user
const getPolicyHiddenVars = (inputType: PostureInput) => {
  switch (inputType) {
    case 'cloudbeat/cis_aws':
    case 'cloudbeat/cis_eks':
      return { 'aws.credentials.type': { value: DEFAULT_AWS_VARS_GROUP } };
    default:
      return undefined;
  }
};

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
  const setEnabledPolicyInput = (inputType: PostureInput) =>
    updatePolicy(getPosturePolicy(newPolicy, inputType, getPolicyHiddenVars(inputType)));

  useEffect(() => {
    // Pick default input type for policy template.
    // Only 1 enabled input is supported when all inputs are initially enabled.
    if (!edit) setEnabledPolicyInput(DEFAULT_INPUT_TYPE[input.policy_template]);

    // Required for mount only to ensure a single input type is selected
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit]);

  return (
    <div>
      {!!edit && <EditScreenStepTitle />}

      {/* Shows info on the active policy template */}
      <PolicyTemplateInfo postureType={input.policy_template} />
      <EuiSpacer size="s" />

      {/* Defines the single enabled input of the active policy template */}
      <PolicyTemplateInputSelector
        input={input}
        setInput={setEnabledPolicyInput}
        disabled={!!edit}
      />
      <EuiSpacer size="m" />

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
