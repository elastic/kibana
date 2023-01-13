/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import type {
  NewPackagePolicy,
  PackagePolicyCreateExtensionComponentProps,
} from '@kbn/fleet-plugin/public';
import { useParams } from 'react-router-dom';
import { assertNever } from '@kbn/std';
import { assert } from '../../../common/utils/helpers';
import type { PostureInput } from '../../../common/types';
import { CLOUDBEAT_AWS, CLOUDBEAT_VANILLA } from '../../../common/constants';
import {
  getPosturePolicy,
  INPUTS_WITH_AWS_VARS,
  getEnabledPostureInput,
  type NewPackagePolicyPostureInput,
  isPosturePolicyTemplate,
} from './utils';
import { AwsCredentialsForm, type AwsCredentialsType } from './aws_credentials_form';
import { PolicyInputSelector } from './policy_template_input_selector';
import type { PosturePolicyTemplate } from '../../../common/types';

const DEFAULT_INPUT_TYPE = {
  kspm: CLOUDBEAT_VANILLA,
  cspm: CLOUDBEAT_AWS,
} as const;

const DEFAULT_AWS_VARS_GROUP: AwsCredentialsType = 'assume_role';

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
    case 'cloudbeat/cis_k8s':
    case 'cloudbeat/cis_gcp':
    case 'cloudbeat/cis_azure':
      return null;
  }

  assertNever(input);
};

export const CspPolicyTemplateForm = memo<Props>(({ newPolicy, onChange, edit }) => {
  const params = useParams<{ integration: PosturePolicyTemplate }>();
  assert(isPosturePolicyTemplate(params.integration), 'Invalid policy template');

  const input = getEnabledPostureInput(newPolicy, DEFAULT_INPUT_TYPE[params.integration]);

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
    updatePolicy(
      getPosturePolicy(
        newPolicy,
        inputType,
        INPUTS_WITH_AWS_VARS.includes(inputType)
          ? { 'aws.credentials.type': { value: DEFAULT_AWS_VARS_GROUP } }
          : undefined
      )
    );

  return (
    <div>
      <PolicyInputSelector input={input} setInput={setEnabledPolicyInput} disabled={!!edit} />
      <PolicyVarsForm input={input} newPolicy={newPolicy} updatePolicy={updatePolicy} />
      <EuiSpacer />
    </div>
  );
});
