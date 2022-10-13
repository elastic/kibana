/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FEATURE_FLAG_NAMES, METRIC_NAMES } from './constants';

function removeDuplicates(obj: Record<string, string>) {
  return [...new Set(Object.values(obj))];
}

describe('constants', () => {
  describe('FEATURE_FLAG_NAMES', () => {
    test('the values should not include duplicates', () => {
      expect(Object.values(FEATURE_FLAG_NAMES)).toStrictEqual(removeDuplicates(FEATURE_FLAG_NAMES));
    });
  });
  describe('METRIC_NAMES', () => {
    test('the values should not include duplicates', () => {
      expect(Object.values(METRIC_NAMES)).toStrictEqual(removeDuplicates(METRIC_NAMES));
    });
  });
});
