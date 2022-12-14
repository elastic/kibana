/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { NewPackagePolicy, NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import { assert } from '../../../common/utils/helpers';
import {
  CLOUDBEAT_AWS,
  CLOUDBEAT_EKS,
  PostureInput,
  SUPPORTED_CLOUDBEAT_INPUTS,
  SUPPORTED_POLICY_TEMPLATES,
  PosturePolicyTemplate,
} from '../../../common/constants';
import { cloudPostureIntegrations } from '../../common/constants';

export type NewPackagePolicyPostureInput = NewPackagePolicyInput & {
  type: PostureInput;
  policy_template: PosturePolicyTemplate;
};

export const isPostureInput = (
  input: NewPackagePolicyInput
): input is NewPackagePolicyPostureInput =>
  SUPPORTED_POLICY_TEMPLATES.includes(input.policy_template as PosturePolicyTemplate) &&
  SUPPORTED_CLOUDBEAT_INPUTS.includes(input.type as PostureInput);

export const inputsWithVars = [CLOUDBEAT_EKS, CLOUDBEAT_AWS];

export const getPolicyWithUpdatedInputs = (
  newPolicy: NewPackagePolicy,
  inputType: PostureInput
): NewPackagePolicy => ({
  ...newPolicy,
  inputs: newPolicy.inputs.map((item) => ({
    ...item,
    enabled: item.type === inputType,
    streams: item.streams.map((stream) => ({
      ...stream,
      enabled: item.type === inputType,
    })),
  })),
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

export const getPolicyWithInputVars = (
  newPolicy: NewPackagePolicy,
  key: string,
  value: string
): NewPackagePolicy => ({
  ...newPolicy,
  inputs: newPolicy.inputs.map((item) =>
    inputsWithVars.includes(item.type) ? getUpdatedStreamVars(item, key, value) : item
  ),
});

export const getPolicyWithHiddenVars = (
  newPolicy: NewPackagePolicy,
  deployment: PostureInput,
  posture: PosturePolicyTemplate
): NewPackagePolicy => ({
  ...newPolicy,
  vars: {
    ...newPolicy.vars,
    deployment: { ...newPolicy.vars?.deployment, value: deployment },
    posture: { ...newPolicy.vars?.posture, value: posture },
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

export const usePostureInput = ({ newPolicy }: { newPolicy: NewPackagePolicy }) => {
  const input = newPolicy.inputs.find((i) => i.enabled);

  // We can't select a default input without knowing the policy template
  // Fleet selects the first policy template input by default
  assert(input, 'No enabled input');
  assert(isPostureInput(input), 'Invalid enabled input');

  return { input };
};
