/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleActionTypes } from '../../../../../../../common';
import { BulkEditOperation } from '../../../../../../application/rule/methods/bulk_edit';
import { BulkEditRulesRequestBodyV1 } from '../../../../../../../common/routes/rule/apis/bulk_edit';

export const transformOperations = (
  operations: BulkEditRulesRequestBodyV1['operations'],
  isSystemAction: (connectorId: string) => boolean
): BulkEditOperation[] => {
  return operations.map((operation) => {
    if (operation.field !== 'actions') {
      return operation;
    }

    const actions = operation.value.map((action) => {
      if (isSystemAction(action.id)) {
        return {
          id: action.id,
          params: action.params,
          uuid: action.uuid,
          type: RuleActionTypes.SYSTEM,
        };
      }

      return {
        id: action.id,
        group: action.group ?? 'default',
        params: action.params,
        uuid: action.uuid,
        frequency: action.frequency,
        type: RuleActionTypes.DEFAULT,
      };
    });

    return {
      field: operation.field,
      operation: operation.operation,
      value: actions,
    };
  });
};
