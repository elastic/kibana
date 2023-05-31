/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkReferences, checkForDataLayerType } from './utils';
import { operationDefinitionMap } from '..';
import { createMockedFullReference } from '../../mocks';
import { layerTypes } from '../../../../../common';
import { DateHistogramIndexPatternColumn } from '../date_histogram';

// Mock prevents issue with circular loading
jest.mock('..');

describe('utils', () => {
  beforeEach(() => {
    // @ts-expect-error test-only operation type
    operationDefinitionMap.testReference = createMockedFullReference();
  });

  describe('checkForDataLayerType', () => {
    it('should return an error if the layer is of the wrong type', () => {
      expect(checkForDataLayerType(layerTypes.REFERENCELINE, 'Operation')).toEqual([
        'Operation is disabled for this type of layer.',
      ]);
    });
  });

  describe('checkReferences', () => {
    it('should show an error if the reference is missing', () => {
      expect(
        checkReferences(
          {
            columns: {
              ref: {
                label: 'Label',
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
              } as DateHistogramIndexPatternColumn,
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
