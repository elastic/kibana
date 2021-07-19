/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkReferences } from './utils';
import { operationDefinitionMap } from '..';
import { createMockedFullReference } from '../../mocks';

// Mock prevents issue with circular loading
jest.mock('..');

describe('utils', () => {
  beforeEach(() => {
    // @ts-expect-error test-only operation type
    operationDefinitionMap.testReference = createMockedFullReference();
  });

  describe('checkReferences', () => {
    it('should show an error if the reference is missing', () => {
      expect(
        checkReferences(
          {
            columns: {
              ref: {
                label: 'Label',
                // @ts-expect-error test-only operation type
                operationType: 'testReference',
                isBucketed: false,
                dataType: 'number',
                references: ['missing'],
              },
            },
            columnOrder: ['ref'],
            indexPatternId: '',
          },
          'ref'
        )
      ).toEqual(['"Label" is not fully configured']);
    });

    it('should show an error if the reference is not allowed per the requirements', () => {
      expect(
        checkReferences(
          {
            columns: {
              ref: {
                label: 'Label',
                // @ts-expect-error test-only operation type
                operationType: 'testReference',
                isBucketed: false,
                dataType: 'number',
                references: ['invalid'],
              },
              invalid: {
                label: 'Date',
                operationType: 'date_histogram',
                isBucketed: true,
                dataType: 'date',
                sourceField: 'timestamp',
                params: { interval: 'auto' },
              },
            },
            columnOrder: ['invalid', 'ref'],
            indexPatternId: '',
          },
          'ref'
        )
      ).toEqual(['Dimension "Label" is configured incorrectly']);
    });
  });
});
