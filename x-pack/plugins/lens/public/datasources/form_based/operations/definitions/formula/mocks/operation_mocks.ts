/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  GenericOperationDefinition,
  OperationDefinition,
  OperationDefinitionMap,
} from '../..';
import type { BaseIndexPatternColumn, GenericIndexPatternColumn } from '../../column_types';
import { getFilter } from '../../helpers';

interface PartialColumnParams {
  kql?: string;
  lucene?: string;
  shift?: string;
  reducedTimeRange?: string;
}

export function createOperationDefinitionMock<
  T extends keyof OperationDefinitionMap<BaseIndexPatternColumn>
>(
  operation: string,
  column: T extends keyof OperationDefinitionMap<BaseIndexPatternColumn>
    ? Partial<OperationDefinition<BaseIndexPatternColumn, T>>
    : Partial<OperationDefinition<BaseIndexPatternColumn, 'field'>>,
  {
    label = operation,
    dataType = 'number',
    isBucketed = false,
    scale = 'ratio',
    timeScale,
  }: Partial<GenericIndexPatternColumn> = {}
): GenericOperationDefinition {
  const { input = 'field', getErrorMessage, buildColumn, ...params } = column;
  const sharedColumnParams = {
    label,
    dataType,
    operationType: operation,
    isBucketed,
    scale,
    timeScale,
  };
  const sharedDefinitionParams = {
    input,
    getDefaultLabel: jest.fn(),
    isTransferable: jest.fn(),
    displayName: label,
    type: operation,
    getErrorMessage: getErrorMessage ?? jest.fn(),
    toExpression: jest.fn(),
  };
  if (input === 'field') {
    return {
      buildColumn:
        buildColumn ??
        jest.fn(({ field }, columnParams: PartialColumnParams) => ({
          sourceField: field.name,
          filter: getFilter(undefined, columnParams),
          reducedTimeRange: columnParams.reducedTimeRange,
          ...sharedColumnParams,
        })),
      onFieldChange: jest.fn(),
      toEsAggsFn: jest.fn(),
      getPossibleOperationForField:
        (params as unknown as OperationDefinition<BaseIndexPatternColumn, 'field'>)
          ?.getPossibleOperationForField ??
        jest.fn((arg) => ({
          scale,
          dataType,
          isBucketed,
        })),
      ...sharedDefinitionParams,
      ...params,
    } as OperationDefinition<BaseIndexPatternColumn, 'field'>;
  }
  if (input === 'fullReference') {
    return {
      buildColumn:
        buildColumn ??
        jest.fn(({ referenceIds }, columnParams: PartialColumnParams) => ({
          references: referenceIds,
          filter: getFilter(undefined, columnParams),
          ...sharedColumnParams,
        })),
      onFieldChange: jest.fn(),
      toEsAggsFn: jest.fn(),
      getPossibleOperation: jest.fn(() => ({
        scale: 'ratio',
        dataType: 'number',
        isBucketed: false,
      })),
      requiredReferences: [
        {
          input: ['field', 'managedReference'],
          validateMetadata: jest.fn(),
        },
      ],
      selectionStyle: 'field',
      ...sharedDefinitionParams,
      ...params,
    } as OperationDefinition<BaseIndexPatternColumn, 'fullReference'>;
  }
  return {
    buildColumn:
      buildColumn ??
      jest.fn((_, columnsParams: PartialColumnParams) => ({
        references: [],
        filter: getFilter(undefined, columnsParams),
        ...sharedColumnParams,
      })),
    getPossibleOperation: jest.fn(),
    createCopy: jest.fn(),
    ...sharedDefinitionParams,
    ...params,
  } as OperationDefinition<BaseIndexPatternColumn, 'none' | 'managedReference'>;
}
