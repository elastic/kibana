/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { safeDump } from 'js-yaml';

import type { FullAgentPolicy } from '../types';

const POLICY_KEYS_ORDER = [
  'id',
  'name',
  'revision',
  'dataset',
  'type',
  'outputs',
  'fleet',
  'output_permissions',
  'agent',
  'inputs',
  'enabled',
  'use_output',
  'meta',
  'input',
  'download',
];

export const fullAgentPolicyToYaml = (policy: FullAgentPolicy, toYaml: typeof safeDump): string => {
  return toYaml(policy, {
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
