/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { safeDump } from 'js-yaml';
import { FullAgentConfig } from '../types';

const CONFIG_KEYS_ORDER = [
  'id',
  'name',
  'revision',
  'type',
  'outputs',
  'agent',
  'inputs',
  'enabled',
  'use_output',
  'meta',
  'input',
];

export const configToYaml = (config: FullAgentConfig): string => {
  return safeDump(config, {
    skipInvalid: true,
    sortKeys: (keyA: string, keyB: string) => {
      const indexA = CONFIG_KEYS_ORDER.indexOf(keyA);
      const indexB = CONFIG_KEYS_ORDER.indexOf(keyB);
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
