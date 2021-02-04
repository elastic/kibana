/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '../../../../../../../src/core/server/mocks';
import { sampleDocNoSortId, sampleDocSearchResultsNoSortId } from './__mocks__/es_results';
import { transformThresholdResultsToEcs } from './bulk_create_threshold_signals';
import { calculateThresholdSignalUuid } from './utils';

describe('transformThresholdResultsToEcs', () => {
  it('should return transformed threshold results', () => {
    const threshold = {
      field: 'source.ip',
      value: 1,
    };
    const startedAt = new Date('2020-12-17T16:27:00Z');
    const transformedResults = transformThresholdResultsToEcs(
      {
        ...sampleDocSearchResultsNoSortId('abcd'),
        aggregations: {
          threshold: {
            buckets: [
              {
                key: '127.0.0.1',
                doc_count: 1,
                top_threshold_hits: {
                  hits: {
                    hits: [sampleDocNoSortId('abcd')],
                  },
                },
              },
            ],
          },
        },
      },
      'test',
      startedAt,
      undefined,
      loggingSystemMock.createLogger(),
      threshold,
      '1234',
      undefined
    );
    const _id = calculateThresholdSignalUuid('1234', startedAt, 'source.ip', '127.0.0.1');
    expect(transformedResults).toEqual({
      took: 10,
      timed_out: false,
      _shards: {
        total: 10,
        successful: 10,
        failed: 0,
        skipped: 0,
      },
      results: {
        hits: {
          total: 1,
        },
      },
      hits: {
        total: 100,
        max_score: 100,
        hits: [
          {
            _id,
            _index: 'test',
            _source: {
              '@timestamp': ['2020-04-20T21:27:45+0000'],
              threshold_result: {
                count: 1,
                value: '127.0.0.1',
              },
            },
          },
        ],
      },
    });
  });
});
