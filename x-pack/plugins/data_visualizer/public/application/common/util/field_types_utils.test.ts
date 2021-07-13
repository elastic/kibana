/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JOB_FIELD_TYPES } from '../../../../common';
import { getJobTypeAriaLabel, jobTypeAriaLabels } from './field_types_utils';

describe('field type utils', () => {
  describe('getJobTypeAriaLabel: Getting a field type aria label by passing what it is stored in constants', () => {
    test('should returns all JOB_FIELD_TYPES labels exactly as it is for each correct value', () => {
      const keys = Object.keys(JOB_FIELD_TYPES);
      const receivedLabels: Record<string, string | null> = {};
      const testStorage = jobTypeAriaLabels;
      keys.forEach((constant) => {
        receivedLabels[constant] = getJobTypeAriaLabel(
          JOB_FIELD_TYPES[constant as keyof typeof JOB_FIELD_TYPES]
        );
      });

      expect(receivedLabels).toEqual(testStorage);
    });
    test('should returns NULL as JOB_FIELD_TYPES does not contain such a keyword', () => {
      expect(getJobTypeAriaLabel('JOB_FIELD_TYPES')).toBe(null);
    });
  });
});
