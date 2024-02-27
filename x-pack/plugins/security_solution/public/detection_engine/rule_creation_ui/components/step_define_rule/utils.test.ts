/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import { showSuppressionMaxGroupValidationError } from './utils';

describe('utils', () => {
  describe('showSuppressionMaxGroupValidationError', () => {
    it('should return true if ruleType is a query rule', () => {
      const ruleType: Type = 'query';
      expect(showSuppressionMaxGroupValidationError(ruleType)).toBe(true);
    });

    it('should return true if ruleType is a threat match rule', () => {
      const ruleType: Type = 'threat_match';
      expect(showSuppressionMaxGroupValidationError(ruleType)).toBe(true);
    });

    it('should return true if ruleType is an EQL rule', () => {
      const ruleType: Type = 'eql';
      expect(showSuppressionMaxGroupValidationError(ruleType)).toBe(true);
    });

    it('should return false if ruleType does not support the max validation', () => {
      const ruleType: Type = 'threshold';
      expect(showSuppressionMaxGroupValidationError(ruleType)).toBe(false);
    });
  });
});
