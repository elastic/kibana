/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleActionTypes } from '@kbn/alerting-plugin/common';
import { NOTIFICATION_DEFAULT_FREQUENCY } from '../../../../../../common/constants';
import type { BulkActionEditPayloadRuleActions } from '../../../../../../common/api/detection_engine/rule_management/bulk_actions/bulk_actions_route';
import { BulkActionEditType } from '../../../../../../common/api/detection_engine/rule_management/bulk_actions/bulk_actions_route';
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

  const actionTests: Array<[BulkActionEditPayloadRuleActions['type'], string]> = [
    [BulkActionEditType.add_rule_actions, 'add'],
    [BulkActionEditType.set_rule_actions, 'set'],
  ];

  test.each(actionTests)('should transform actions bulk edit %s correctly', (type, operation) => {
    const defaultAction = {
      id: 'id',
      action_type_id: 'action_type_id',
      params: {},
      group: 'group',
    };

    const systemAction = {
      id: 'id',
      action_type_id: 'action_type_id',
      params: {},
      uuid: 'uuid',
      type: RuleActionTypes.SYSTEM,
    };

    expect(
      bulkEditActionToRulesClientOperation({
        type,
        value: {
          actions: [defaultAction, systemAction],
        },
      })
    ).toEqual([
      {
        field: 'actions',
        operation,
        value: [
          {
            id: 'id',
            group: 'group',
            params: {},
            frequency: NOTIFICATION_DEFAULT_FREQUENCY,
          },
          {
            id: 'id',
            params: {},
            type: RuleActionTypes.SYSTEM,
            uuid: 'uuid',
          },
        ],
      },
    ]);
  });
});
