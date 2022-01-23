/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import isEqual from 'lodash/isEqual';
import { percolateSourceEvents } from './percolate_source_events';
import {
  mockPercolatorRuleDataClient,
  mockRuleId,
  mockRuleVersion,
  sampleChunkedSourceEventHits,
  mockSpaceId,
} from './mocks';

describe('percolateSourceEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('makes expected requests', async () => {
    await percolateSourceEvents({
      chunkedSourceEventHits: sampleChunkedSourceEventHits,
      percolatorRuleDataClient: mockPercolatorRuleDataClient,
      ruleId: mockRuleId,
      ruleVersion: mockRuleVersion,
      spaceId: mockSpaceId,
    });

    const expectedQuery1 = {
      body: {
        query: {
          constant_score: {
            filter: {
              percolate: {
                field: 'query',
                documents: [
                  { existingMockField: 1, rule_id: 'abcd-defg-hijk-lmno', rule_version: 1337 },
                  { existingMockField: 2, rule_id: 'abcd-defg-hijk-lmno', rule_version: 1337 },
                  { existingMockField: 3, rule_id: 'abcd-defg-hijk-lmno', rule_version: 1337 },
                ],
              },
            },
          },
        },
      },
    };

    const expectedQuery2 = {
      body: {
        query: {
          constant_score: {
            filter: {
              percolate: {
                field: 'query',
                documents: [
                  { existingMockField: 4, rule_id: 'abcd-defg-hijk-lmno', rule_version: 1337 },
                  { existingMockField: 5, rule_id: 'abcd-defg-hijk-lmno', rule_version: 1337 },
                  { existingMockField: 6, rule_id: 'abcd-defg-hijk-lmno', rule_version: 1337 },
                ],
              },
            },
          },
        },
      },
    };

    const mockCall1 = mockPercolatorRuleDataClient.getReader({ namespace: mockSpaceId }).search.mock
      .calls[0][0];
    const mockCall2 = mockPercolatorRuleDataClient.getReader({ namespace: mockSpaceId }).search.mock
      .calls[1][0];

    expect(isEqual(mockCall1, expectedQuery1) || isEqual(mockCall2, expectedQuery1)).toBe(true);
    expect(isEqual(mockCall1, expectedQuery2) || isEqual(mockCall2, expectedQuery2)).toBe(true);
  });
});
