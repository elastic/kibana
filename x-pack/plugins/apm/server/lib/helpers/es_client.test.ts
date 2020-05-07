/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isApmIndex } from './es_client';

describe('isApmIndex', () => {
  const apmIndices = [
    'apm-*-metric-*',
    'apm-*-onboarding-*',
    'apm-*-span-*',
    'apm-*-transaction-*',
    'apm-*-error-*'
  ];
  describe('when indexParam is a string', () => {
    it('should return true if it matches any of the items in apmIndices', () => {
      const indexParam = 'apm-*-transaction-*';
      expect(isApmIndex(apmIndices, indexParam)).toBe(true);
    });

    it('should return false if it does not match any of the items in `apmIndices`', () => {
      const indexParam = '.ml-anomalies-*';
      expect(isApmIndex(apmIndices, indexParam)).toBe(false);
    });
  });

  describe('when indexParam is an array', () => {
    it('should return true if all values in `indexParam` matches values in `apmIndices`', () => {
      const indexParam = ['apm-*-transaction-*', 'apm-*-span-*'];
      expect(isApmIndex(apmIndices, indexParam)).toBe(true);
    });

    it("should return false if some of the values don't match with `apmIndices`", () => {
      const indexParam = ['apm-*-transaction-*', '.ml-anomalies-*'];
      expect(isApmIndex(apmIndices, indexParam)).toBe(false);
    });
  });

  describe('when indexParam is neither a string or an array', () => {
    it('should return false', () => {
      [true, false, undefined].forEach(indexParam => {
        expect(isApmIndex(apmIndices, indexParam)).toBe(false);
      });
    });
  });
});
