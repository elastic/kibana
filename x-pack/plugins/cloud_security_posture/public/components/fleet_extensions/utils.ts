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
  SUPPORTED_POLICY_TEMPLATES,
  SUPPORTED_CLOUDBEAT_INPUTS,
  PostureInput,
  PosturePolicyTemplate,
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

export type NewPackagePolicyPostureInput = NewPackagePolicyInput & {
  type: PostureInput;
  policy_template: PosturePolicyTemplate;
};

export const isPostureInput = (
  input: NewPackagePolicyInput
): input is NewPackagePolicyPostureInput =>
  SUPPORTED_POLICY_TEMPLATES.includes(input.policy_template as PosturePolicyTemplate) &&
  SUPPORTED_CLOUDBEAT_INPUTS.includes(input.type as PostureInput);

export const getUpdatedPosturePolicy = (
  newPolicy: NewPackagePolicy,
  inputType: PostureInput,
  inputVars?: Record<string, PackagePolicyConfigRecordEntry>
): NewPackagePolicy => ({
  ...newPolicy,
  // Enable new policy input and disable all others
  inputs: newPolicy.inputs.map((item) => ({
    ...item,
    enabled: item.type === inputType,
    streams: item.streams.map((stream) => ({
      ...stream,
      enabled: item.type === inputType,
      // Merge new vars with existing vars
      ...(item.type === inputType &&
        stream.vars &&
        inputVars && { vars: merge({}, stream.vars, inputVars) }),
    })),
  })),
  // Set hidden policy vars
  vars: {
    ...newPolicy.vars,
    deployment: { ...newPolicy.vars?.deployment, value: inputType },
    posture: {
      ...newPolicy.vars?.posture,
      value: newPolicy.inputs.find((input) => input.type === inputType)
        ?.policy_template as PosturePolicyTemplate,
    },
  },
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

export const getPostureInput = (policy: NewPackagePolicy) => {
  // Take first enabled input
  const input = policy.inputs.find((i) => i.enabled);

  assert(input, 'Missing enabled input'); // We can't provide a default input without knowing the policy template
  assert(isPostureInput(input), 'Invalid enabled input');

  return input;
};
