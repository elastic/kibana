/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BulkActionEditType } from '../../../../../../common/detection_engine/rule_management';
import { bulkEditActionToRulesClientOperation } from './action_to_rules_client_operation';

describe('bulkEditActionToRulesClientOperation', () => {
  test('should transform tags bulk edit actions correctly', () => {
    expect(
      bulkEditActionToRulesClientOperation({ type: BulkActionEditType.add_tags, value: ['test'] })
    ).toEqual([
      {
        field: 'tags',
        operation: 'add',
        value: ['test'],
      },
    ]);
  });

  expect(
    bulkEditActionToRulesClientOperation({ type: BulkActionEditType.set_tags, value: ['test'] })
  ).toEqual([
    {
      field: 'tags',
      operation: 'set',
      value: ['test'],
    },
  ]);

  expect(
    bulkEditActionToRulesClientOperation({ type: BulkActionEditType.delete_tags, value: ['test'] })
  ).toEqual([
    {
      field: 'tags',
      operation: 'delete',
      value: ['test'],
    },
  ]);

  test('should transform schedule bulk edit correctly', () => {
    expect(
      bulkEditActionToRulesClientOperation({
        type: BulkActionEditType.set_schedule,
        value: {
          interval: '100m',
          lookback: '10m',
        },
      })
    ).toEqual([
      {
        field: 'schedule',
        operation: 'set',
        value: { interval: '100m' },
      },
    ]);
  });
});
