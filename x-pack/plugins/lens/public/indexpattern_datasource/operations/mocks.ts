/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { OperationMetadata } from '../../types';
import type { OperationType } from './definitions';

export const createMockedReferenceOperation = () => {
  return {
    input: 'fullReference',
    displayName: 'Reference test',
    type: 'testReference' as OperationType,
    selectionStyle: 'full',
    requiredReferences: [
      {
        // Any numeric metric that isn't also a reference
        input: ['none', 'field'],
        validateMetadata: (meta: OperationMetadata) =>
          meta.dataType === 'number' && !meta.isBucketed,
      },
    ],
    buildColumn: jest.fn((args) => {
      return {
        label: 'Test reference',
        isBucketed: false,
        dataType: 'number',

        operationType: 'testReference',
        references: args.referenceIds,
      };
    }),
    isTransferable: jest.fn(),
    toExpression: jest.fn().mockReturnValue([]),
    getPossibleOperation: jest.fn().mockReturnValue({ dataType: 'number', isBucketed: false }),
    getDefaultLabel: jest.fn().mockReturnValue('Default label'),
    hasInvalidReferences: jest.fn(),
  };
};
