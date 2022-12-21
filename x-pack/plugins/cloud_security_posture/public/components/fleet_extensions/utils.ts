/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { NewPackagePolicy, NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import {
  CLOUDBEAT_AWS,
  CLOUDBEAT_EKS,
  CLOUDBEAT_VANILLA,
  CLOUDBEAT_INTEGRATION,
  SUPPORTED_POLICY_TEMPLATES,
  POLICY_TEMPLATE,
} from '../../../common/constants';

export const isEksInput = (input: NewPackagePolicyInput) => input.type === CLOUDBEAT_EKS;
export const inputsWithVars = [CLOUDBEAT_EKS, CLOUDBEAT_AWS];
const defaultInputType: Record<POLICY_TEMPLATE, CLOUDBEAT_INTEGRATION> = {
  kspm: CLOUDBEAT_VANILLA,
  cspm: CLOUDBEAT_AWS,
};
export const getEnabledInputType = (inputs: NewPackagePolicy['inputs']): CLOUDBEAT_INTEGRATION => {
  const enabledInput = getEnabledInput(inputs);

  if (enabledInput) return enabledInput.type as CLOUDBEAT_INTEGRATION;

  const policyTemplate = inputs[0].policy_template as POLICY_TEMPLATE | undefined;

  if (policyTemplate && SUPPORTED_POLICY_TEMPLATES.includes(policyTemplate))
    return defaultInputType[policyTemplate];

  throw new Error('unsupported policy template');
};

export const getEnabledInput = (
  inputs: NewPackagePolicy['inputs']
): NewPackagePolicyInput | undefined => inputs.find((input) => input.enabled);

export const getUpdatedDeploymentType = (
  newPolicy: NewPackagePolicy,
  inputType: CLOUDBEAT_INTEGRATION
) => ({
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
      inputsWithVars.includes(item.type) ? getUpdatedStreamVars(item, key, value) : item
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
