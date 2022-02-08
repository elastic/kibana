/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import isEqual from 'lodash/isEqual';
import { percolateSourceEvents } from './percolate_source_events';
import { mockPercolatorRuleDataClient, mockRuleId, mockRuleVersion, mockSpaceId } from './mocks';

describe('percolateSourceEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('makes expected requests', async () => {
    await percolateSourceEvents({
      // @ts-ignore
      hits: [{ _source: { mock: 1 } }, { _source: { mock: 2 } }, { _source: { mock: 3 } }],
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
                  { mock: 1, rule_id: 'abcd-defg-hijk-lmno', rule_version: 1337 },
                  { mock: 2, rule_id: 'abcd-defg-hijk-lmno', rule_version: 1337 },
                  { mock: 3, rule_id: 'abcd-defg-hijk-lmno', rule_version: 1337 },
                ],
              },
            },
          },
        },
      },
    };

    const mockCall1 = mockPercolatorRuleDataClient.getReader({ namespace: mockSpaceId }).search.mock
      .calls[0][0];

    expect(isEqual(mockCall1, expectedQuery1)).toBe(true);
  });
});
