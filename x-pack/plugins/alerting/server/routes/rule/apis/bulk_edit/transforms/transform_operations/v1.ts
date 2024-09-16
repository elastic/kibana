/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BulkEditOperation } from '../../../../../../application/rule/methods/bulk_edit';
import { BulkEditRulesRequestBodyV1 } from '../../../../../schemas/rule/apis/bulk_edit';

export const transformOperations = ({
  operations,
  isSystemAction,
}: {
  operations?: BulkEditRulesRequestBodyV1['operations'];
  isSystemAction: (connectorId: string) => boolean;
}): BulkEditOperation[] => {
  if (operations == null || operations.length === 0) {
    return [];
  }

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
        };
      }

      return {
        id: action.id,
        group: action.group ?? 'default',
        params: action.params,
        uuid: action.uuid,
        frequency: action.frequency,
      };
    });

    return {
      field: operation.field,
      operation: operation.operation,
      value: actions,
    };
  });
};
