/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertRuleIdsToKueryNode } from './convert_rule_ids_to_kuery_node';

describe('convertRuleIdsToKueryNode', () => {
  test('should convert ids correctly', () => {
    expect(convertRuleIdsToKueryNode(['1'])).toEqual({
      arguments: [
        { type: 'literal', value: 'alert.id' },
        { type: 'literal', value: 'alert:1' },
        { type: 'literal', value: false },
      ],
      function: 'is',
      type: 'function',
    });
  });

  test('should convert multiple ids correctly', () => {
    expect(convertRuleIdsToKueryNode(['1', '22'])).toEqual({
      arguments: [
        {
          arguments: [
            {
              type: 'literal',
              value: 'alert.id',
            },
            {
              type: 'literal',
              value: 'alert:1',
            },
            {
              type: 'literal',
              value: false,
            },
          ],
          function: 'is',
          type: 'function',
        },
        {
          arguments: [
            {
              type: 'literal',
              value: 'alert.id',
            },
            {
              type: 'literal',
              value: 'alert:22',
            },
            {
              type: 'literal',
              value: false,
            },
          ],
          function: 'is',
          type: 'function',
        },
      ],
      function: 'or',
      type: 'function',
    });
  });

  test('should convert empty ids array correctly', () => {
    expect(convertRuleIdsToKueryNode([])).toEqual(undefined);
  });
});
