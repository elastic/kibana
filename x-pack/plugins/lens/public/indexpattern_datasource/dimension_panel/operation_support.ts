/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import memoizeOne from 'memoize-one';
import { DatasourceDimensionDropProps, OperationMetadata } from '../../types';
import { OperationType } from '../indexpattern';
import { memoizedGetAvailableOperationsByMetadata, OperationFieldTuple } from '../operations';
import { IndexPatternPrivateState } from '../types';

export interface OperationSupportMatrix {
  operationByField: Partial<Record<string, Set<OperationType>>>;
  operationWithoutField: Set<OperationType>;
  fieldByOperation: Partial<Record<OperationType, Set<string>>>;
}

type Props = Pick<
  DatasourceDimensionDropProps<IndexPatternPrivateState>,
  'layerId' | 'columnId' | 'state' | 'filterOperations'
>;

function computeOperationMatrix(
  operationsByMetadata: Array<{
    operationMetaData: OperationMetadata;
    operations: OperationFieldTuple[];
  }>,
  filterOperations: (operation: OperationMetadata) => boolean
) {
  const filteredOperationsByMetadata = operationsByMetadata.filter((operation) =>
    filterOperations(operation.operationMetaData)
  );

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
}

// memoize based on latest execution. It supports multiple args
const memoizedComputeOperationsMatrix = memoizeOne(computeOperationMatrix);

// TODO: the support matrix should be available outside of the dimension panel
export const getOperationSupportMatrix = (props: Props): OperationSupportMatrix => {
  const layerId = props.layerId;
  const currentIndexPattern = props.state.indexPatterns[props.state.layers[layerId].indexPatternId];

  const operationsByMetadata = memoizedGetAvailableOperationsByMetadata(currentIndexPattern);
  return memoizedComputeOperationsMatrix(operationsByMetadata, props.filterOperations);
};
