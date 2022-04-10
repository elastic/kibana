/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { persistThreatQueries } from './persist_threat_queries';
import {
  mockPercolatorRuleDataClient,
  mockRuleId,
  mockRuleVersion,
  mockSpaceId,
  mockThreatQueries,
} from './mocks';

describe('persistThreatQueries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('makes the expected request', async () => {
    await persistThreatQueries({
      percolatorRuleDataClient: mockPercolatorRuleDataClient,
      threatQueriesToPersist: mockThreatQueries,
      ruleId: mockRuleId,
      ruleVersion: mockRuleVersion,
      spaceId: mockSpaceId,
    });

    expect(
      mockPercolatorRuleDataClient.getWriter({ namespace: mockSpaceId }).bulk.mock.calls[0][0]
    ).toEqual({
      body: [
        { create: { _index: '.percolator.alerts-security.alertseces-space', _id: 'test-id-0' } },
        {
          query: {
            bool: {
              must: [
                { match: { rule_id: 'abcd-defg-hijk-lmno' } },
                { match: { rule_version: 1337 } },
              ],
              should: [{ match: { 'source.ip': { query: '127.0.0.1' } } }],
              minimum_should_match: 1,
            },
          },
          threat: {
            enrichments: [
              {
                matched: {
                  id: '123',
                  index: 'test-indicators',
                  atomic: '127.0.0.1',
                  field: 'source.ip',
                  type: 'indicator_match_rule',
                },
                indicator: {
                  host: { name: 'host-1', ip: '192.168.0.0.1' },
                  source: { ip: '127.0.0.1', port: 1 },
                  destination: { ip: '127.0.0.1', port: 1 },
                },
                feed: { name: 'threatquotient' },
              },
            ],
          },
          rule_id: 'abcd-defg-hijk-lmno',
          rule_version: 1337,
        },
        { create: { _index: '.percolator.alerts-security.alertseces-space', _id: 'test-id-1' } },
        {
          query: {
            bool: {
              must: [
                { match: { rule_id: 'abcd-defg-hijk-lmno' } },
                { match: { rule_version: 1337 } },
              ],
              should: [{ match: { 'destination.ip': { query: '127.0.0.1' } } }],
              minimum_should_match: 1,
            },
          },
          threat: {
            enrichments: [
              {
                matched: {
                  id: '123',
                  index: 'test-indicators',
                  atomic: '127.0.0.1',
                  field: 'destination.ip',
                  type: 'indicator_match_rule',
                },
                indicator: {
                  host: { name: 'host-1', ip: '192.168.0.0.1' },
                  source: { ip: '127.0.0.1', port: 1 },
                  destination: { ip: '127.0.0.1', port: 1 },
                },
                feed: { name: 'threatquotient' },
              },
            ],
          },
          rule_id: 'abcd-defg-hijk-lmno',
          rule_version: 1337,
        },
      ],
    });
  });
});
