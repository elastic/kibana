/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrioritizedFieldValuePairs } from './get_prioritized_field_value_pairs';

describe('correlations', () => {
  describe('getPrioritizedFieldValuePairs', () => {
    it('returns fields without prioritization in the same order', () => {
      const fieldValuePairs = [
        { field: 'the-field-1', value: 'the-value-1' },
        { field: 'the-field-2', value: 'the-value-2' },
      ];
      const prioritziedFieldValuePairs = getPrioritizedFieldValuePairs(
        fieldValuePairs
      );
      expect(prioritziedFieldValuePairs.map((d) => d.field)).toEqual([
        'the-field-1',
        'the-field-2',
      ]);
    });

    it('returns fields with already sorted prioritization in the same order', () => {
      const fieldValuePairs = [
        { field: 'service.version', value: 'the-value-1' },
        { field: 'the-field-2', value: 'the-value-2' },
      ];
      const prioritziedFieldValuePairs = getPrioritizedFieldValuePairs(
        fieldValuePairs
      );
      expect(prioritziedFieldValuePairs.map((d) => d.field)).toEqual([
        'service.version',
        'the-field-2',
      ]);
    });

    it('returns fields with unsorted prioritization in the corrected order', () => {
      const fieldValuePairs = [
        { field: 'the-field-1', value: 'the-value-1' },
        { field: 'service.version', value: 'the-value-2' },
      ];
      const prioritziedFieldValuePairs = getPrioritizedFieldValuePairs(
        fieldValuePairs
      );
      expect(prioritziedFieldValuePairs.map((d) => d.field)).toEqual([
        'service.version',
        'the-field-1',
      ]);
    });

    it('considers prefixes when sorting', () => {
      const fieldValuePairs = [
        { field: 'the-field-1', value: 'the-value-1' },
        { field: 'service.version', value: 'the-value-2' },
        { field: 'cloud.the-field-3', value: 'the-value-3' },
      ];
      const prioritziedFieldValuePairs = getPrioritizedFieldValuePairs(
        fieldValuePairs
      );
      expect(prioritziedFieldValuePairs.map((d) => d.field)).toEqual([
        'service.version',
        'cloud.the-field-3',
        'the-field-1',
      ]);
    });
  });
});
