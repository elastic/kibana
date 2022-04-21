/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockedIndexPattern } from '../../../mocks';
import type { IndexPatternLayer } from '../../../types';
import {
  overallAverageOperation,
  overallMaxOperation,
  overallMinOperation,
  overallSumOperation,
} from '..';

describe('overall_metric', () => {
  const indexPattern = createMockedIndexPattern();
  let layer: IndexPatternLayer;

  beforeEach(() => {
    layer = {
      indexPatternId: '1',
      columnOrder: [],
      columns: {},
    };
  });

  describe('buildColumn', () => {
    it('should assign the right operationType', () => {
      const args = {
        layer,
        indexPattern,
        referenceIds: ['a'],
      };
      expect(overallAverageOperation.buildColumn(args)).toEqual(
        expect.objectContaining({ operationType: 'overall_average' })
      );
      expect(overallMaxOperation.buildColumn(args)).toEqual(
        expect.objectContaining({ operationType: 'overall_max' })
      );
      expect(overallMinOperation.buildColumn(args)).toEqual(
        expect.objectContaining({ operationType: 'overall_min' })
      );
      expect(overallSumOperation.buildColumn(args)).toEqual(
        expect.objectContaining({ operationType: 'overall_sum' })
      );
    });
  });
});
