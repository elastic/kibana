/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleRegistryMocks } from '../../../../../../../rule_registry/server/mocks';

export const mockPercolatorRuleDataClient = ruleRegistryMocks.createRuleDataClient(
  '.percolator.alerts-security.alerts'
);

export const mockRuleId = 'abcd-defg-hijk-lmno';

export const mockRuleVersion = 1337;

export const mockSpaceId = 'eces-space';

export const mockThreatQueries = [
  {
    id: 'test-id-0',
    bool: {
      must: [{ match: { rule_id: 'abcd-defg-hijk-lmno' } }, { match: { rule_version: 1337 } }],
      should: [{ match: { 'source.ip': { query: '127.0.0.1' } } }],
      minimum_should_match: 1,
    },
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
        feed: {
          name: 'threatquotient',
        },
      },
    ],
  },
  {
    id: 'test-id-1',
    bool: {
      must: [{ match: { rule_id: 'abcd-defg-hijk-lmno' } }, { match: { rule_version: 1337 } }],
      should: [{ match: { 'destination.ip': { query: '127.0.0.1' } } }],
      minimum_should_match: 1,
    },
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
        feed: {
          name: 'threatquotient',
        },
      },
    ],
  },
];

export const emptySearchResult = {
  searchResult: {
    took: 0,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      failed: 0,
      skipped: 0,
    },
    hits: {
      total: 0,
      max_score: 0,
      hits: [],
    },
  },
  searchDuration: '0',
  searchErrors: [],
};

export const searchResultOneEvent = {
  searchResult: {
    took: 0,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      failed: 0,
      skipped: 0,
    },
    hits: {
      total: 0,
      max_score: 0,
      hits: [
        {
          _id: '1111',
          _index: 'event-index',
          _source: {
            event: {
              category: 'fake',
            },
            file: {
              hash: {
                sha1: 'asdf',
              },
            },
          },
          sort: ['333'],
        },
      ],
    },
  },
  searchDuration: '0',
  searchErrors: [],
};
