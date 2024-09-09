/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLabel } from '.';

describe('labels', () => {
  describe('getLabel', () => {
    it('returns the expected label when risk score is a number', () => {
      const baseLabel = 'mimikatz process started';
      const riskScore = 99;

      expect(getLabel({ baseLabel, riskScore })).toBe('mimikatz process started (Risk 99)');
    });

    it('returns the expected label when risk score is null', () => {
      const baseLabel = 'mimikatz process started';
      const riskScore = null;

      expect(getLabel({ baseLabel, riskScore })).toBe(baseLabel);
    });

    it('returns the expected label when risk score is undefined', () => {
      const baseLabel = 'mimikatz process started';
      const riskScore = undefined;

      expect(getLabel({ baseLabel, riskScore })).toBe(baseLabel);
    });
  });
});
