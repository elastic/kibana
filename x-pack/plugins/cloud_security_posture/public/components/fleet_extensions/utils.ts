/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  NewPackagePolicyInputStream,
  PackagePolicyConfigRecordEntry,
} from '@kbn/fleet-plugin/common';
import merge from 'lodash/merge';
import {
  CLOUDBEAT_AWS,
  CLOUDBEAT_EKS,
  CLOUDBEAT_VANILLA,
  SUPPORTED_POLICY_TEMPLATES,
  SUPPORTED_CLOUDBEAT_INPUTS,
  type PostureInput,
  type PosturePolicyTemplate,
} from '../../../common/constants';
import { assert } from '../../../common/utils/helpers';
import { cloudPostureIntegrations } from '../../common/constants';

export const isEksInput = (input: NewPackagePolicyInput) => input.type === CLOUDBEAT_EKS;
export const INPUTS_WITH_AWS_VARS = [CLOUDBEAT_EKS, CLOUDBEAT_AWS];
const defaultInputType: Record<PosturePolicyTemplate, PostureInput> = {
  kspm: CLOUDBEAT_VANILLA,
  cspm: CLOUDBEAT_AWS,
};
export const getEnabledInputType = (inputs: NewPackagePolicy['inputs']): PostureInput => {
  const enabledInput = getEnabledInput(inputs);

  if (enabledInput) return enabledInput.type as PostureInput;

  const policyTemplate = inputs[0].policy_template as PosturePolicyTemplate | undefined;

  if (policyTemplate && SUPPORTED_POLICY_TEMPLATES.includes(policyTemplate))
    return defaultInputType[policyTemplate];

  throw new Error('unsupported policy template');
};

export const getEnabledInput = (
  inputs: NewPackagePolicy['inputs']
): NewPackagePolicyInput | undefined => inputs.find((input) => input.enabled);

export const getUpdatedDeploymentType = (newPolicy: NewPackagePolicy, inputType: PostureInput) => ({
  isValid: true, // TODO: add validations
  updatedPolicy: {
    ...newPolicy,
    inputs: newPolicy.inputs.map((item) => ({
      ...item,
      enabled: item.type === inputType,
      streams: item.streams.map((stream) => ({
        ...stream,
        enabled: item.type === inputType,
      })),
    })),
  },
});

export const getUpdatedEksVar = (newPolicy: NewPackagePolicy, key: string, value: string) => ({
  isValid: true, // TODO: add validations
  updatedPolicy: {
    ...newPolicy,
    inputs: newPolicy.inputs.map((item) =>
      INPUTS_WITH_AWS_VARS.includes(item.type) ? getUpdatedStreamVars(item, key, value) : item
    ),
  },
});

// TODO: remove access to first stream
const getUpdatedStreamVars = (item: NewPackagePolicyInput, key: string, value: string) => {
  if (!item.streams[0]) return item;

  return {
    ...item,
    streams: [
      {
        ...item.streams[0],
        vars: {
          ...item.streams[0]?.vars,
          [key]: {
            ...item.streams[0]?.vars?.[key],
            value,
          },
        },
      },
    ],
  };
};

type StreamWithRequiredVars = Array<
  NewPackagePolicyInputStream & Required<Pick<NewPackagePolicyInputStream, 'vars'>>
>;

// Extend NewPackagePolicyInput with known string literals for input type, policy template and streams
export type NewPackagePolicyPostureInput = NewPackagePolicyInput &
  (
    | { type: 'cloudbeat/cis_azure'; policy_template: 'cspm' }
    | { type: 'cloudbeat/cis_gcp'; policy_template: 'cspm' }
    | { type: 'cloudbeat/cis_k8s'; policy_template: 'kspm' }
    | { type: 'cloudbeat/cis_aws'; policy_template: 'cspm'; streams: StreamWithRequiredVars }
    | { type: 'cloudbeat/cis_eks'; policy_template: 'kspm'; streams: StreamWithRequiredVars }
  );

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
