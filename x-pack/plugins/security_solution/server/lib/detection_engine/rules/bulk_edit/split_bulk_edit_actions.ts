/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BulkActionEditPayload,
  BulkActionEditType,
  BulkActionEditForRuleAttributes,
  BulkActionEditForRuleParams,
} from '../../../../../common/detection_engine/schemas/common/schemas';

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
      case BulkActionEditType.add_tags:
      case BulkActionEditType.set_tags:
      case BulkActionEditType.delete_tags:
        acc.attributesActions.push(action);
        break;
      default:
        acc.paramsActions.push(action);
    }

    return acc;
  }, splitActions);
};
