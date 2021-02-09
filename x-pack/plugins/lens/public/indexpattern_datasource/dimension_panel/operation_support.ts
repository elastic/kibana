/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { DatasourceDimensionDropProps, OperationMetadata } from '../../types';
import { OperationType } from '../indexpattern';
import { getAvailableOperationsByMetadata, getSortScoreByPriority } from '../operations';
import { IndexPatternPrivateState, IndexPatternField } from '../types';

import { operationDefinitions } from '../operations/definitions';

export interface OperationSupportMatrix {
  operationByField: Partial<Record<string, Set<OperationType>>>;
  operationWithoutField: Set<OperationType>;
  fieldByOperation: Partial<Record<OperationType, Set<string>>>;
}

type Props = Pick<
  DatasourceDimensionDropProps<IndexPatternPrivateState>,
  'layerId' | 'columnId' | 'state' | 'filterOperations'
>;

// TODO: the support matrix should be available outside of the dimension panel

// TODO: This code has historically been memoized, as a potentially performance
// sensitive task. If we can add memoization without breaking the behavior, we should.
export const getOperationSupportMatrix = (props: Props): OperationSupportMatrix => {
  const layerId = props.layerId;
  const currentIndexPattern = props.state.indexPatterns[props.state.layers[layerId].indexPatternId];

  const filteredOperationsByMetadata = getAvailableOperationsByMetadata(
    currentIndexPattern
  ).filter((operation) => props.filterOperations(operation.operationMetaData));

  const supportedOperationsByField: Partial<Record<string, Set<OperationType>>> = {};
  const supportedOperationsWithoutField: Set<OperationType> = new Set();
  const supportedFieldsByOperation: Partial<Record<OperationType, Set<string>>> = {};

  filteredOperationsByMetadata.forEach(({ operations }) => {
    operations.forEach((operation) => {
      if (operation.type === 'field') {
        if (!supportedOperationsByField[operation.field]) {
          supportedOperationsByField[operation.field] = new Set();
        }
        supportedOperationsByField[operation.field]?.add(operation.operationType);

        if (!supportedFieldsByOperation[operation.operationType]) {
          supportedFieldsByOperation[operation.operationType] = new Set();
        }
        supportedFieldsByOperation[operation.operationType]?.add(operation.field);
      } else {
        supportedOperationsWithoutField.add(operation.operationType);
      }
    });
  });
  return {
    operationByField: supportedOperationsByField,
    operationWithoutField: supportedOperationsWithoutField,
    fieldByOperation: supportedFieldsByOperation,
  };
};

export const getOperationsForField = (
  field: IndexPatternField,
  filterOperations: (operation: OperationMetadata) => boolean
): OperationType[] =>
  operationDefinitions
    .filter((operation) => {
      if (operation.input !== 'field') {
        return false;
      }
      const possibleOperation = operation.getPossibleOperationForField(field);
      return possibleOperation && filterOperations(possibleOperation);
    })
    .sort(getSortScoreByPriority)
    .map((o) => o.type);
