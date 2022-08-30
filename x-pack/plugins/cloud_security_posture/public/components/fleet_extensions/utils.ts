/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { NewPackagePolicy, NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import { CLOUDBEAT_EKS, CLOUDBEAT_VANILLA } from '../../../common/constants';
import type { InputType } from './deployment_type_select';

export const isEksInput = (input: NewPackagePolicyInput) => input.type === CLOUDBEAT_EKS;

export const getEnabledInputType = (inputs: NewPackagePolicy['inputs']): InputType =>
  (inputs.find((input) => input.enabled)?.type as InputType) || CLOUDBEAT_VANILLA;

export const getUpdatedDeploymentType = (newPolicy: NewPackagePolicy, inputType: InputType) => ({
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
      isEksInput(item) ? getUpdatedStreamVars(item, key, value) : item
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
