/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BulkActionEditType } from '../../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema';
import type {
  BulkActionEditPayload,
  BulkActionEditForRuleAttributes,
  BulkActionEditForRuleParams,
} from '../../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema';

/**
 * Split bulk edit actions in 2 chunks: actions applied to params and
 * actions applied to attributes
 * @param actions BulkActionEditPayload[]
 * @returns lists of split actions
 */
export const splitBulkEditActions = (actions: BulkActionEditPayload[]) => {
  const splitActions: {
    attributesActions: BulkActionEditForRuleAttributes[];
    paramsActions: BulkActionEditForRuleParams[];
  } = {
    attributesActions: [],
    paramsActions: [],
  };

  return actions.reduce((acc, action) => {
    switch (action.type) {
      case BulkActionEditType.set_schedule:
        acc.attributesActions.push(action);
        acc.paramsActions.push(action);
        break;
      case BulkActionEditType.add_tags:
      case BulkActionEditType.set_tags:
      case BulkActionEditType.delete_tags:
      case BulkActionEditType.add_rule_actions:
      case BulkActionEditType.set_rule_actions:
        acc.attributesActions.push(action);
        break;
      default:
        acc.paramsActions.push(action);
    }

    return acc;
  }, splitActions);
};
