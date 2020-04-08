/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UIPolicyConfig } from '../types';

/**
 * A typed Object.entries() function where the keys and values are typed based on the given object
 */
const entries = <T extends object>(o: T): Array<[keyof T, T[keyof T]]> =>
  Object.entries(o) as Array<[keyof T, T[keyof T]]>;
type DeepPartial<T> = { [K in keyof T]?: DeepPartial<T[K]> };

/**
 * Returns a deep copy of `UIPolicyConfig` object
 */
export function clone(policyDetailsConfig: UIPolicyConfig): UIPolicyConfig {
  const clonedConfig: DeepPartial<UIPolicyConfig> = {};
  for (const [key, val] of entries(policyDetailsConfig)) {
    if (typeof val === 'object') {
      const valClone: Partial<typeof val> = {};
      clonedConfig[key] = valClone;
      for (const [key2, val2] of entries(val)) {
        if (typeof val2 === 'object') {
          valClone[key2] = {
            ...val2,
          };
        } else {
          clonedConfig[key] = {
            ...val,
          };
        }
      }
    } else {
      clonedConfig[key] = val;
    }
  }

  /**
   * clonedConfig is typed as DeepPartial so we can construct the copy from an empty object
   */
  return clonedConfig as UIPolicyConfig;
}

/**
 * Returns cloned `configuration` with `value` set by the `keyPath`.
 */

export function setIn<
  K1 extends keyof UIPolicyConfig,
  K2 extends keyof UIPolicyConfig[K1],
  K3 extends keyof UIPolicyConfig[K1][K2]
>(configuration: UIPolicyConfig, keyPath: [K1, K2, K3], value: boolean | string): UIPolicyConfig;
export function setIn<K1 extends keyof UIPolicyConfig, K2 extends keyof UIPolicyConfig[K1]>(
  configuration: UIPolicyConfig,
  keyPath: [K1, K2],
  value: UIPolicyConfig[K1][K2]
): UIPolicyConfig;
export function setIn<K1 extends keyof UIPolicyConfig>(
  configuration: UIPolicyConfig,
  keyPath: [K1],
  value: UIPolicyConfig[K1]
): UIPolicyConfig;
export function setIn(
  configuration: UIPolicyConfig,
  keyPath: string[],
  value: boolean | string
): UIPolicyConfig {
  const payload = clone(configuration);
  let current: any = payload;
  while (keyPath.length > 1) {
    current = current[keyPath.shift()!];
  }
  current[keyPath[0]] = value;
  return payload;
}
