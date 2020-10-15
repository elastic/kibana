/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { safeDump } from 'js-yaml';
import { FullAgentPolicy } from '../types';

const POLICY_KEYS_ORDER = [
  'id',
  'name',
  'revision',
  'dataset',
  'type',
  'outputs',
  'agent',
  'inputs',
  'enabled',
  'use_output',
  'meta',
  'input',
];

export const fullAgentPolicyToYaml = (policy: FullAgentPolicy): string => {
  return safeDump(policy, {
    skipInvalid: true,
    sortKeys: (keyA: string, keyB: string) => {
      const indexA = POLICY_KEYS_ORDER.indexOf(keyA);
      const indexB = POLICY_KEYS_ORDER.indexOf(keyB);
      if (indexA >= 0 && indexB < 0) {
        return -1;
      }

      if (indexA < 0 && indexB >= 0) {
        return 1;
      }

      return indexA - indexB;
    },
  });
};
