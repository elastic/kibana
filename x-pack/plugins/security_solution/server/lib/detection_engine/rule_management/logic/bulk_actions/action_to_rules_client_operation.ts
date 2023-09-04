/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkEditOperation } from '@kbn/alerting-plugin/server';
import { transformNormalizedRuleToAlertAction } from '../../../../../../common/detection_engine/transform_actions';

import type { BulkActionEditForRuleAttributes } from '../../../../../../common/api/detection_engine/rule_management/bulk_actions/bulk_actions_route';
import { BulkActionEditType } from '../../../../../../common/api/detection_engine/rule_management/bulk_actions/bulk_actions_route';
import { assertUnreachable } from '../../../../../../common/utility_types';
import { transformToActionFrequency } from '../../normalization/rule_actions';

/**
 * converts bulk edit action to format of rulesClient.bulkEdit operation
 * @param action BulkActionEditForRuleAttributes
 * @returns rulesClient BulkEditOperation
 */
export const bulkEditActionToRulesClientOperation = (
  action: BulkActionEditForRuleAttributes
): BulkEditOperation[] => {
  switch (action.type) {
    // tags actions
    case BulkActionEditType.add_tags:
      return [
        {
          field: 'tags',
          operation: 'add',
          value: action.value,
        },
      ];

    case BulkActionEditType.delete_tags:
      return [
        {
          field: 'tags',
          operation: 'delete',
          value: action.value,
        },
      ];

    case BulkActionEditType.set_tags:
      return [
        {
          field: 'tags',
          operation: 'set',
          value: action.value,
        },
      ];

    // rule actions
    case BulkActionEditType.add_rule_actions:
      return [
        {
          field: 'actions',
          operation: 'add',
          value: transformToActionFrequency(action.value.actions, action.value.throttle).map(
            transformNormalizedRuleToAlertAction
          ),
        },
      ];

    case BulkActionEditType.set_rule_actions:
      return [
        {
          field: 'actions',
          operation: 'set',
          value: transformToActionFrequency(action.value.actions, action.value.throttle).map(
            transformNormalizedRuleToAlertAction
          ),
        },
      ];

    // schedule actions
    case BulkActionEditType.set_schedule:
      return [
        {
          field: 'schedule',
          operation: 'set',
          value: {
            interval: action.value.interval,
          },
        },
      ];

    default:
      return assertUnreachable(action);
  }
};
