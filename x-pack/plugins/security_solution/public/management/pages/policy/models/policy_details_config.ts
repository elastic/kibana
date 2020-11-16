/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash';
import { UIPolicyConfig } from '../../../../../common/endpoint/types';

/**
 * Returns value from `configuration`
 */
export const getIn = (a: UIPolicyConfig) => <Key extends keyof UIPolicyConfig>(key: Key) => <
  SubKey extends keyof UIPolicyConfig[Key]
>(
  subKey: SubKey
) => <LeafKey extends keyof UIPolicyConfig[Key][SubKey]>(
  leafKey: LeafKey
): UIPolicyConfig[Key][SubKey][LeafKey] => {
  return a[key][subKey][leafKey];
};

/**
 * Returns cloned `configuration` with `value` set by the `keyPath`.
 */
export const setIn = (a: UIPolicyConfig) => <Key extends keyof UIPolicyConfig>(key: Key) => <
  SubKey extends keyof UIPolicyConfig[Key]
>(
  subKey: SubKey
) => <LeafKey extends keyof UIPolicyConfig[Key][SubKey]>(leafKey: LeafKey) => <
  V extends UIPolicyConfig[Key][SubKey][LeafKey]
>(
  v: V
): UIPolicyConfig => {
  const c = cloneDeep(a);
  c[key][subKey][leafKey] = v;
  return c;
};
