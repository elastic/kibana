/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Truthy } from 'lodash';
import {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PackagePolicy,
  PackagePolicyInput,
} from '@kbn/fleet-plugin/common';
import { INTEGRATION_PACKAGE_NAME } from '../constants';
import type { PolicyId } from '../types';
import { INPUT_CONTROL } from '../constants';

/**
 * @example
 * declare const foo: Array<string | undefined | null>
 * foo.filter(isNonNullable) // foo is Array<string>
 */
export const isNonNullable = <T extends unknown>(v: T): v is NonNullable<T> =>
  v !== null && v !== undefined;

export const truthy = <T>(value: T): value is Truthy<T> => !!value;

export const extractErrorMessage = (e: unknown, defaultMessage = 'Unknown Error'): string => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;

  return defaultMessage; // TODO: i18n
};

export const isEnabledControlInputType = (input: PackagePolicyInput | NewPackagePolicyInput) =>
  input.enabled;

export const isCloudDefendPackage = (packageName?: string) =>
  packageName === INTEGRATION_PACKAGE_NAME;

export const getControlPolicyFromPackagePolicy = (
  inputs: PackagePolicy['inputs'] | NewPackagePolicy['inputs']
): PolicyId => {
  const enabledInputs = inputs.filter(isEnabledControlInputType);

  // Use the only enabled input
  if (enabledInputs.length === 1) {
    return getInputType(enabledInputs[0].type);
  }

  // Use the default benchmark id for multiple/none selected
  return getInputType(INPUT_CONTROL);
};

const getInputType = (inputType: string): string => {
  // Get the last part of the input type, input type structure: cloudbeat/<benchmark_id>
  return inputType.split('/')[1];
};

export const CLOUD_DEFEND_FLEET_PACKAGE_KUERY = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${INTEGRATION_PACKAGE_NAME}`;

export function assert(condition: any, msg?: string): asserts condition {
  if (!condition) {
    throw new Error(msg);
  }
}
