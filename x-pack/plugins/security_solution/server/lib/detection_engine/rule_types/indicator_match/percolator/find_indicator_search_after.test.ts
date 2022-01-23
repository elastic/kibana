/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import isEqual from 'lodash/isEqual';
import { findIndicatorSearchAfter } from './find_indicator_search_after';
import { mockPercolatorRuleDataClient, mockRuleId, mockRuleVersion, mockSpaceId } from './mocks';

describe('findIndicatorSearchAfter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('makes expected query', async () => {
    mockPercolatorRuleDataClient.getReader({ namespace: mockSpaceId }).search.mockResolvedValue({
      hits: {
        hits: [{ _source: { indicator_search_after_value: [9999] } }],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const value = await findIndicatorSearchAfter({
      percolatorRuleDataClient: mockPercolatorRuleDataClient,
      spaceId: mockSpaceId,
      ruleId: mockRuleId,
      ruleVersion: mockRuleVersion,
      timestampOverride: 'event.ingested',
    });

    expect(
      isEqual(
        mockPercolatorRuleDataClient.getReader({ namespace: mockSpaceId }).search.mock.calls[0][0],
        {
          body: {
            query: {
              percolate: {
                field: 'query',
                document: {
                  rule_id: 'abcd-defg-hijk-lmno',
                  rule_version: 1337,
                  is_search_after_query: true,
                },
              },
            },
            size: 1,
            sort: [{ 'event.ingested': { order: 'desc' } }],
          },
        }
      )
    ).toEqual(true);
    expect(value).toEqual([9999]);
  });

  it('returns undefined for no hits', async () => {
    mockPercolatorRuleDataClient.getReader({ namespace: mockSpaceId }).search.mockResolvedValue({
      hits: { hits: [] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const value = await findIndicatorSearchAfter({
      percolatorRuleDataClient: mockPercolatorRuleDataClient,
      spaceId: mockSpaceId,
      ruleId: mockRuleId,
      ruleVersion: mockRuleVersion,
      timestampOverride: 'event.ingested',
    });

    expect(value).not.toBeDefined();
  });
});
