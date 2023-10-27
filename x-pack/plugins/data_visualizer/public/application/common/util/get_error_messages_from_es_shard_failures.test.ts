/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getErrorMessagesFromEsShardFailures } from './get_error_messages_from_es_shard_failures';

describe('getErrorMessagesFromEsShardFailures', () => {
  test('returns extracted reasons if _shard.failures exist', () => {
    const reason =
      '[parent] Data too large, data for [<reused_arrays>] would be [1059268784/1010.1mb], which is larger than the limit of [1020054732/972.7mb], real usage: [940288176/896.7mb], new bytes reserved: [118980608/113.4mb], usages [inflight_requests=60008/58.6kb, model_inference=0/0b, eql_sequence=0/0b, fielddata=245141854/233.7mb, request=162398296/154.8mb]';
    const resp = {
      took: 37,
      timed_out: false,
      _shards: {
        total: 2,
        successful: 1,
        skipped: 1,
        failed: 1,
        failures: [
          {
            shard: 0,
            index: 'apm-7.2.0-span-2019.10.31',
            node: 'PEyAKEkKQFql88n4oXyYMw',
            reason: {
              type: 'circuit_breaking_exception',
              reason,
              bytes_wanted: 1059268784,
              bytes_limit: 1020054732,
              durability: 'PERMANENT',
            },
          },
        ],
      },
      hits: {
        total: 0,
        max_score: 0,
        hits: [],
      },
    };
    expect(getErrorMessagesFromEsShardFailures(resp)).toEqual([reason]);
  });

  test('returns empty array if _shard.failures not defined', () => {
    const resp = {
      took: 37,
      timed_out: false,
    };
    expect(getErrorMessagesFromEsShardFailures(resp)).toEqual([]);
    expect(getErrorMessagesFromEsShardFailures(null)).toEqual([]);
    expect(getErrorMessagesFromEsShardFailures(undefined)).toEqual([]);
    expect(getErrorMessagesFromEsShardFailures('')).toEqual([]);
  });
});
