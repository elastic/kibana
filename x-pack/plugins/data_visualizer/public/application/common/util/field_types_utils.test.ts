/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SUPPORTED_FIELD_TYPES } from '../../../../common/constants';
import { getJobTypeLabel, jobTypeLabels } from './field_types_utils';

describe('field type utils', () => {
  describe('getJobTypeLabel: Getting a field type aria label by passing what it is stored in constants', () => {
    test('should returns all SUPPORTED_FIELD_TYPES labels exactly as it is for each correct value', () => {
      const keys = Object.keys(SUPPORTED_FIELD_TYPES);
      const receivedLabels: Record<string, string | null> = {};
      const testStorage = jobTypeLabels;
      keys.forEach((key) => {
        const constant = key as keyof typeof SUPPORTED_FIELD_TYPES;
        receivedLabels[SUPPORTED_FIELD_TYPES[constant]] = getJobTypeLabel(
          SUPPORTED_FIELD_TYPES[constant]
        );
      });

      expect(receivedLabels).toEqual(testStorage);
    });
    test('should returns NULL as SUPPORTED_FIELD_TYPES does not contain such a keyword', () => {
      expect(getJobTypeLabel('SUPPORTED_FIELD_TYPES')).toBe(null);
    });
  });
});
