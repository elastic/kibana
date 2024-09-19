/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filterDuplicateSignals } from './filter_duplicate_signals';
import { sampleWrappedSignalHit } from './__mocks__/es_results';

const mockRuleId1 = 'aaaaaaaa';
const mockRuleId2 = 'bbbbbbbb';
const mockRuleId3 = 'cccccccc';

const createWrappedSignalHitWithRuleId = (ruleId: string) => {
  const mockSignal = sampleWrappedSignalHit();
  return {
    ...mockSignal,
    _source: {
      ...mockSignal._source,
      signal: {
        ...mockSignal._source.signal,
        ancestors: [
          {
            ...mockSignal._source.signal.ancestors[0],
            rule: ruleId,
          },
        ],
      },
    },
  };
};
const mockSignals = [
  createWrappedSignalHitWithRuleId(mockRuleId1),
  createWrappedSignalHitWithRuleId(mockRuleId2),
];

describe('filterDuplicateSignals', () => {
  describe('detection engine implementation', () => {
    it('filters duplicate signals', () => {
      expect(filterDuplicateSignals(mockRuleId1, mockSignals, false).length).toEqual(1);
    });

    it('does not filter non-duplicate signals', () => {
      expect(filterDuplicateSignals(mockRuleId3, mockSignals, false).length).toEqual(2);
    });
  });
});
