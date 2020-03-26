/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PolicyConfig } from '../types';

/**
 * A typed Object.entries() function where the keys and values are typed based on the given object
 */
const entries = <T extends object>(o: T): Array<[keyof T, T[keyof T]]> =>
  Object.entries(o) as Array<[keyof T, T[keyof T]]>;
type DeepPartial<T> = { [K in keyof T]?: DeepPartial<T[K]> };

/**
 * Returns a deep copy of PolicyDetailsConfig
 */
export function clone(policyDetailsConfig: PolicyConfig): PolicyConfig {
  const clonedConfig: DeepPartial<PolicyConfig> = {};
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
  return clonedConfig as PolicyConfig;
}
