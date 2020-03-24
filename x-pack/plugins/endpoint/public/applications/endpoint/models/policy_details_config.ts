/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PolicyDetailsConfig } from '../types';

const entries = <T extends object>(o: T): Array<[keyof T, T[keyof T]]> =>
  Object.entries(o) as Array<[keyof T, T[keyof T]]>;
type DeepPartial<T> = { [K in keyof T]?: DeepPartial<T[K]> };

/**
 * Returns a deep copy of PolicyDetailsConfig
 */
export function clone(policyDetailsConfig: PolicyDetailsConfig): PolicyDetailsConfig {
  const clonedConfig: DeepPartial<PolicyDetailsConfig> = {};
  for (const [key, val] of entries(policyDetailsConfig)) {
    if (typeof val === 'object') {
      const valClone: Partial<typeof val> = {};
      clonedConfig[key] = valClone as typeof valClone;
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
  return clonedConfig as PolicyDetailsConfig;
}
