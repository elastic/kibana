/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { DatasourceDimensionDropProps } from '../../types';
import { OperationType } from '../indexpattern';
import { getAvailableOperationsByMetadata } from '../operations';
import { IndexPatternPrivateState } from '../types';

export interface OperationSupportMatrix {
  operationByField: Partial<Record<string, OperationType[]>>;
  operationWithoutField: OperationType[];
  fieldByOperation: Partial<Record<OperationType, string[]>>;
}

type Props = Pick<
  DatasourceDimensionDropProps<IndexPatternPrivateState>,
  'layerId' | 'columnId' | 'state' | 'filterOperations'
>;

// TODO: This code has historically been memoized, as a potentially performance
// sensitive task. If we can add memoization without breaking the behavior, we should.
export const getOperationSupportMatrix = (props: Props): OperationSupportMatrix => {
  const layerId = props.layerId;
  const currentIndexPattern = props.state.indexPatterns[props.state.layers[layerId].indexPatternId];

  const filteredOperationsByMetadata = getAvailableOperationsByMetadata(
    currentIndexPattern
  ).filter((operation) => props.filterOperations(operation.operationMetaData));

  const supportedOperationsByField: Partial<Record<string, OperationType[]>> = {};
  const supportedOperationsWithoutField: OperationType[] = [];
  const supportedFieldsByOperation: Partial<Record<OperationType, string[]>> = {};

  filteredOperationsByMetadata.forEach(({ operations }) => {
    operations.forEach((operation) => {
      if (operation.type === 'field') {
        if (!supportedOperationsByField[operation.field]) {
          supportedOperationsByField[operation.field] = [];
        }
        supportedOperationsByField[operation.field]?.push(operation.operationType);

        if (!supportedFieldsByOperation[operation.operationType]) {
          supportedFieldsByOperation[operation.operationType] = [];
        }
        supportedFieldsByOperation[operation.operationType]?.push(operation.field);
      } else if (operation.type === 'none') {
        supportedOperationsWithoutField.push(operation.operationType);
      }
    });
  });
  return {
    operationByField: _.mapValues(supportedOperationsByField, _.uniq),
    operationWithoutField: _.uniq(supportedOperationsWithoutField),
    fieldByOperation: _.mapValues(supportedFieldsByOperation, _.uniq),
  };
};
