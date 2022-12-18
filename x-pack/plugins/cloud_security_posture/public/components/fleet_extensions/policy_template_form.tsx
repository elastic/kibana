/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useEffect } from 'react';
import { EuiSpacer } from '@elastic/eui';
import type {
  NewPackagePolicy,
  PackagePolicyCreateExtensionComponentProps,
} from '@kbn/fleet-plugin/public';
import type { PostureInput } from '../../../common/constants';
import {
  getPolicyWithUpdatedInputs,
  getPolicyWithHiddenVars,
  getPolicyWithInputVars,
  inputsWithVars,
  getPostureInput,
  type NewPackagePolicyPostureInput,
} from './utils';
import { AwsCredentialsForm } from './aws_credentials_form';
import { PolicyInputSelector } from './policy_template_input_selector';

const DEFAULT_INPUT_TYPE = {
  kspm: 'cloudbeat/cis_k8s',
  cspm: 'cloudbeat/cis_aws',
} as const;

const DEFAULT_AWS_VARS_GROUP = 'assume_role';

interface Props extends PackagePolicyCreateExtensionComponentProps {
  edit?: boolean;
}

interface PolicyVarsFormProps {
  newPolicy: NewPackagePolicy;
  input: NewPackagePolicyPostureInput;
  updatePolicy(updatedPolicy: NewPackagePolicy): void;
}

const PolicyVarsForm = ({ input, ...props }: PolicyVarsFormProps) => {
  switch (input.type) {
    case 'cloudbeat/cis_aws':
    case 'cloudbeat/cis_eks':
      return <AwsCredentialsForm {...props} input={input} />;
    default:
      return null;
  }
};

export const CspPolicyTemplateForm = memo<Props>(({ newPolicy, onChange, edit }) => {
  const input = getPostureInput(newPolicy);

  const updatePolicy = (updatedPolicy: NewPackagePolicy) =>
    onChange({
      isValid: true,
      updatedPolicy,
    });

  /**
   * - Updates policy inputs by user selection
   * - Updates hidden policy vars
   */
  const updatePolicyInput = (inputType: PostureInput) => {
    // Apply user selection to enable an input type
    let policy = getPolicyWithUpdatedInputs(newPolicy, inputType);

    if (inputsWithVars.includes(inputType)) {
      // Define aws.credentials.type
      policy = getPolicyWithInputVars(policy, 'aws.credentials.type', DEFAULT_AWS_VARS_GROUP);
    }

    // Define 'posture' and 'deployment'
    policy = getPolicyWithHiddenVars(policy, inputType, input.policy_template);

    updatePolicy(policy);
  };

  useEffect(() => {
    // Pick default input type for policy template.
    // Only 1 enabled input is supported when all inputs are initially enabled.
    if (!edit) updatePolicyInput(DEFAULT_INPUT_TYPE[input.policy_template]);

    // Required for mount only to ensure a single input type is selected
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit]);

  return (
    <div>
      <PolicyInputSelector input={input} updatePolicyInput={updatePolicyInput} disabled={edit} />
      <PolicyVarsForm input={input} newPolicy={newPolicy} updatePolicy={updatePolicy} />
      <EuiSpacer />
    </div>
  );
});
