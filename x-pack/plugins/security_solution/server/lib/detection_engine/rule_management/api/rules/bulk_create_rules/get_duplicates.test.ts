/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkCreateRulesRequestBody } from '../../../../../../../common/detection_engine/rule_management';
import { getDuplicates } from './get_duplicates';

describe('getDuplicates', () => {
  test("returns array of ruleIds showing the duplicate keys of 'value2' and 'value3'", () => {
    const output = getDuplicates(
      [
        { rule_id: 'value1' },
        { rule_id: 'value2' },
        { rule_id: 'value2' },
        { rule_id: 'value3' },
        { rule_id: 'value3' },
        {},
        {},
      ] as BulkCreateRulesRequestBody,
      'rule_id'
    );
    const expected = ['value2', 'value3'];
    expect(output).toEqual(expected);
  });

  test('returns null when given a map of no duplicates', () => {
    const output = getDuplicates(
      [
        { rule_id: 'value1' },
        { rule_id: 'value2' },
        { rule_id: 'value3' },
        {},
        {},
      ] as BulkCreateRulesRequestBody,
      'rule_id'
    );
    const expected: string[] = [];
    expect(output).toEqual(expected);
  });
});
