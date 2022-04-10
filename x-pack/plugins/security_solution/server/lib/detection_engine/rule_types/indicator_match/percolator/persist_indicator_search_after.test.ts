/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockPercolatorRuleDataClient, mockRuleId, mockRuleVersion, mockSpaceId } from './mocks';
import { persistIndicatorSearchAfter } from './persist_indicator_search_after';

describe('persistIndicatorSearchAfter', () => {
  const percolatorRuleDataClientMock = mockPercolatorRuleDataClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('makes the expected query', async () => {
    await persistIndicatorSearchAfter({
      percolatorRuleDataClient: percolatorRuleDataClientMock,
      searchAfter: ['999999'],
      ruleId: mockRuleId,
      ruleVersion: mockRuleVersion,
      spaceId: mockSpaceId,
    });

    const actualRequest = percolatorRuleDataClientMock.getWriter({ namespace: mockSpaceId }).bulk
      .mock.calls[0][0];

    // @ts-ignore @timestamp is defined
    const timestamp = actualRequest.body[1]['@timestamp'];
    expect(timestamp).toBeDefined();

    // @ts-ignore @timestamp keeps changing so we remove it
    delete actualRequest.body[1]['@timestamp'];

    expect(actualRequest).toEqual({
      body: [
        { create: { _index: '.percolator.alerts-security.alertseces-space', _id: '999999' } },
        {
          indicator_search_after_value: ['999999'],
          query: {
            bool: {
              must: [
                { match: { rule_id: 'abcd-defg-hijk-lmno' } },
                { match: { rule_version: 1337 } },
                { match: { is_search_after_query: true } },
              ],
            },
          },
        },
      ],
    });
  });
});
