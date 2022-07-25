/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HistogramItem } from '../../../../../common/correlations/types';

import { replaceHistogramDotsWithBars } from '.';

describe('TransactionDistributionChart', () => {
  describe('replaceHistogramDotsWithBars', () => {
    it('does the thing', () => {
      const mockHistogram = [
        { doc_count: 10 },
        { doc_count: 10 },
        { doc_count: 0 },
        { doc_count: 0 },
        { doc_count: 0 },
        { doc_count: 10 },
        { doc_count: 10 },
        { doc_count: 0 },
        { doc_count: 10 },
        { doc_count: 10 },
      ] as HistogramItem[];

      expect(replaceHistogramDotsWithBars(mockHistogram)).toEqual([
        { doc_count: 10 },
        { doc_count: 10 },
        { doc_count: 0.0001 },
        { doc_count: 0.0001 },
        { doc_count: 0.0001 },
        { doc_count: 10 },
        { doc_count: 10 },
        { doc_count: 0.0001 },
        { doc_count: 10 },
        { doc_count: 10 },
      ]);
    });
  });
});
