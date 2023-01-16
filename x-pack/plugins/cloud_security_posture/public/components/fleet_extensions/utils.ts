/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackagePolicyConfigRecordEntry,
} from '@kbn/fleet-plugin/common';
import merge from 'lodash/merge';
import {
  CLOUDBEAT_AWS,
  CLOUDBEAT_EKS,
  CLOUDBEAT_VANILLA,
  CLOUDBEAT_GCP,
  CLOUDBEAT_AZURE,
  SUPPORTED_POLICY_TEMPLATES,
  SUPPORTED_CLOUDBEAT_INPUTS,
} from '../../../common/constants';
import type { PostureInput, PosturePolicyTemplate } from '../../../common/types';
import { assert } from '../../../common/utils/helpers';
import { cloudPostureIntegrations } from '../../common/constants';

export const INPUTS_WITH_AWS_VARS = [CLOUDBEAT_EKS, CLOUDBEAT_AWS];

type PosturePolicyInput =
  | { type: typeof CLOUDBEAT_AZURE; policy_template: 'cspm' }
  | { type: typeof CLOUDBEAT_GCP; policy_template: 'cspm' }
  | { type: typeof CLOUDBEAT_AWS; policy_template: 'cspm' }
  | { type: typeof CLOUDBEAT_VANILLA; policy_template: 'kspm' }
  | { type: typeof CLOUDBEAT_EKS; policy_template: 'kspm' };

// Extend NewPackagePolicyInput with known string literals for input type and policy template
export type NewPackagePolicyPostureInput = NewPackagePolicyInput & PosturePolicyInput;

export const isPostureInput = (
  input: NewPackagePolicyInput
): input is NewPackagePolicyPostureInput =>
  SUPPORTED_POLICY_TEMPLATES.includes(input.policy_template as PosturePolicyTemplate) &&
  SUPPORTED_CLOUDBEAT_INPUTS.includes(input.type as PostureInput);

const getInputPolicyTemplate = (inputs: NewPackagePolicyInput[], inputType: PostureInput) =>
  inputs.filter(isPostureInput).find((i) => i.type === inputType)!.policy_template;

const getPostureInput = (
  input: NewPackagePolicyInput,
  inputType: PostureInput,
  inputVars?: Record<string, PackagePolicyConfigRecordEntry>
) => {
  const isInputEnabled = input.type === inputType;

  return {
    ...input,
    enabled: isInputEnabled,
    streams: input.streams.map((stream) => ({
      ...stream,
      enabled: isInputEnabled,
      // Merge new vars with existing vars
      ...(isInputEnabled &&
        stream.vars &&
        inputVars && { vars: merge({}, stream.vars, inputVars) }),
    })),
  };
};

/**
 * Get a new object with the updated policy input and vars
 */
export const getPosturePolicy = (
  newPolicy: NewPackagePolicy,
  inputType: PostureInput,
  inputVars?: Record<string, PackagePolicyConfigRecordEntry>
): NewPackagePolicy => ({
  ...newPolicy,
  // Enable new policy input and disable all others
  inputs: newPolicy.inputs.map((item) => getPostureInput(item, inputType, inputVars)),
  // Set hidden policy vars
  vars: merge({}, newPolicy.vars, {
    deployment: { value: inputType },
    posture: { value: getInputPolicyTemplate(newPolicy.inputs, inputType) },
  }),
});

export const getPolicyTemplateInputOptions = (policyTemplate: PosturePolicyTemplate) =>
  cloudPostureIntegrations[policyTemplate].options.map((o) => ({
    tooltip: o.tooltip,
    value: o.type,
    id: o.type,
    label: o.name,
    icon: o.icon,
    disabled: o.disabled,
  }));

export const getEnabledPostureInput = (policy: NewPackagePolicy) => {
  // Take first enabled input
  const input = policy.inputs.find((i) => i.enabled);

  assert(input, 'Missing enabled input'); // We can't provide a default input without knowing the policy template
  assert(isPostureInput(input), 'Invalid enabled input');

  return input;
};
