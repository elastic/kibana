/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkEditOperation } from '@kbn/alerting-plugin/server';

import type { BulkActionEditForRuleAttributes } from '../../../../../common/detection_engine/schemas/common/schemas';
import { BulkActionEditType } from '../../../../../common/detection_engine/schemas/common/schemas';
import { assertUnreachable } from '../../../../../common/utility_types';

/**
 * converts bulk edit action to format of rulesClient.bulkEdit operation
 * @param action BulkActionEditForRuleAttributes
 * @returns rulesClient BulkEditOperation
 */
export const bulkEditActionToRulesClientOperation = (
  action: BulkActionEditForRuleAttributes
): BulkEditOperation => {
  switch (action.type) {
    // tags actions
    case BulkActionEditType.add_tags:
      return {
        field: 'tags',
        operation: 'add',
        value: action.value,
      };

    case BulkActionEditType.delete_tags:
      return {
        field: 'tags',
        operation: 'delete',
        value: action.value,
      };

    case BulkActionEditType.set_tags:
      return {
        field: 'tags',
        operation: 'set',
        value: action.value,
      };

    default:
      return assertUnreachable(action.type);
  }
};
