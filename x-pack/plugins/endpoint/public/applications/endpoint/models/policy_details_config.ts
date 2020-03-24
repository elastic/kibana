/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash';
import { PolicyDetailsConfig } from '../types';
/**
 * Returns a deep copy of PolicyDetailsConfig
 */
export function clone(policyDetailsConfig: PolicyDetailsConfig): PolicyDetailsConfig {
  return cloneDeep(policyDetailsConfig);

  /*
  let clonedConfig: Partial<PolicyDetailsConfig> = {};
  for (const [key, val] of Object.entries(policyDetailsConfig)) {
    if (typeof val === 'object') {
      for (const [key2, val2] of Object.entries(val)) {
        if (typeof val2 === 'object') {
          clonedConfig[key][key2] = {
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
  return clonedConfig;
 */
}
