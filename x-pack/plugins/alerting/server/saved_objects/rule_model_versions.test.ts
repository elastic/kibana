/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CustomSavedObjectsModelVersionMap,
  getLatestRuleVersion,
  getMinimumCompatibleVersion,
} from './rule_model_versions';
import { schema } from '@kbn/config-schema';
import { RawRule } from '../types';

describe('rule model versions', () => {
  const ruleModelVersions: CustomSavedObjectsModelVersionMap = {
    '1': {
      changes: [],
      schemas: {
        create: schema.object({
          name: schema.string(),
        }),
      },
      isCompatibleWithPreviousVersion: (rawRule) => true,
    },
    '2': {
      changes: [],
      schemas: {
        create: schema.object({
          name: schema.string(),
        }),
      },
      isCompatibleWithPreviousVersion: (rawRule) => false,
    },
    '3': {
      changes: [],
      schemas: {
        create: schema.object({
          name: schema.string(),
        }),
      },
      isCompatibleWithPreviousVersion: (rawRule) => rawRule.name === 'test',
    },
    '4': {
      changes: [],
      schemas: {
        create: schema.object({
          name: schema.string(),
        }),
      },
      isCompatibleWithPreviousVersion: (rawRule) => rawRule.name === 'test',
    },
  };

  const rawRule = { name: 'test' } as RawRule;
  const mismatchingRawRule = { enabled: true } as RawRule;

  describe('getMinimumCompatibleVersion', () => {
    it('should return the minimum compatible version for the matching rawRule', () => {
      expect(getMinimumCompatibleVersion(ruleModelVersions, 1, rawRule)).toBe(1);
      expect(getMinimumCompatibleVersion(ruleModelVersions, 2, rawRule)).toBe(2);
      expect(getMinimumCompatibleVersion(ruleModelVersions, 3, rawRule)).toBe(2);
      expect(getMinimumCompatibleVersion(ruleModelVersions, 4, rawRule)).toBe(2);
    });
    it('should return the minimum compatible version for the mismatching rawRule', () => {
      expect(getMinimumCompatibleVersion(ruleModelVersions, 3, mismatchingRawRule)).toBe(3);
      expect(getMinimumCompatibleVersion(ruleModelVersions, 4, mismatchingRawRule)).toBe(4);
    });
  });

  describe('getLatestRuleVersion', () => {
    it('should return the latest rule model version', () => {
      expect(getLatestRuleVersion()).toBe(1);
    });
  });
});
