/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '../../../../../../../../src/core/server/mocks';
import { ThresholdNormalized } from '../../../../../common/detection_engine/schemas/common/schemas';
import { sampleDocNoSortId, sampleDocSearchResultsNoSortId } from '../__mocks__/es_results';
import { sampleThresholdSignalHistory } from '../__mocks__/threshold_signal_history.mock';
import { calculateThresholdSignalUuid } from '../utils';
import { transformThresholdResultsToEcs } from './bulk_create_threshold_signals';

describe('transformThresholdNormalizedResultsToEcs', () => {
  it('should return transformed threshold results', () => {
    const threshold: ThresholdNormalized = {
      field: ['source.ip', 'host.name'],
      value: 1,
      cardinality: [
        {
          field: 'destination.ip',
          value: 5,
        },
      ],
    };
    const from = new Date('2020-12-17T16:27:00Z');
    const startedAt = new Date('2020-12-17T16:27:00Z');
    const transformedResults = transformThresholdResultsToEcs(
      {
        ...sampleDocSearchResultsNoSortId('abcd'),
        aggregations: {
          'threshold_0:source.ip': {
            buckets: [
              {
                key: '127.0.0.1',
                doc_count: 15,
                'threshold_1:host.name': {
                  buckets: [
                    {
                      key: 'garden-gnomes',
                      doc_count: 12,
                      top_threshold_hits: {
                        hits: {
                          hits: [sampleDocNoSortId('abcd')],
                        },
                      },
                      cardinality_count: {
                        value: 7,
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
      'test',
      startedAt,
      from,
      undefined,
      loggingSystemMock.createLogger(),
      threshold,
      '1234',
      undefined,
      sampleThresholdSignalHistory()
    );
    const _id = calculateThresholdSignalUuid(
      '1234',
      startedAt,
      ['source.ip', 'host.name'],
      '127.0.0.1,garden-gnomes'
    );
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
              '@timestamp': '2020-04-20T21:27:45+0000',
              'host.name': 'garden-gnomes',
              'source.ip': '127.0.0.1',
              threshold_result: {
                from: new Date('2020-12-17T16:28:00.000Z'), // from threshold signal history
                terms: [
                  {
                    field: 'host.name',
                    value: 'garden-gnomes',
                  },
                  {
                    field: 'source.ip',
                    value: '127.0.0.1',
                  },
                ],
                cardinality: [
                  {
                    field: 'destination.ip',
                    value: 7,
                  },
                ],
                count: 12,
              },
            },
          },
        ],
      },
    });
  });

  it('should return transformed threshold results with empty buckets', () => {
    const threshold: ThresholdNormalized = {
      field: ['source.ip', 'host.name'],
      value: 1,
      cardinality: [
        {
          field: 'destination.ip',
          value: 5,
        },
      ],
    };
    const from = new Date('2020-12-17T16:27:00Z');
    const startedAt = new Date('2020-12-17T16:27:00Z');
    const transformedResults = transformThresholdResultsToEcs(
      {
        ...sampleDocSearchResultsNoSortId('abcd'),
        aggregations: {
          'threshold_0:source.ip': {
            buckets: [
              {
                key: '127.0.0.1',
                doc_count: 15,
                'threshold_1:host.name': {
                  buckets: [],
                },
              },
            ],
          },
        },
      },
      'test',
      startedAt,
      from,
      undefined,
      loggingSystemMock.createLogger(),
      threshold,
      '1234',
      undefined,
      sampleThresholdSignalHistory()
    );
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
          total: 0,
        },
      },
      hits: {
        total: 100,
        max_score: 100,
        hits: [],
      },
    });
  });

  it('should return transformed threshold results without threshold fields', () => {
    const threshold: ThresholdNormalized = {
      field: [],
      value: 1,
      cardinality: [
        {
          field: 'destination.ip',
          value: 5,
        },
      ],
    };
    const from = new Date('2020-12-17T16:27:00Z');
    const startedAt = new Date('2020-12-17T16:27:00Z');
    const transformedResults = transformThresholdResultsToEcs(
      {
        ...sampleDocSearchResultsNoSortId('abcd'),
        aggregations: {
          threshold_0: {
            buckets: [
              {
                key: '',
                doc_count: 15,
                top_threshold_hits: {
                  hits: {
                    hits: [sampleDocNoSortId('abcd')],
                  },
                },
                cardinality_count: {
                  value: 7,
                },
              },
            ],
          },
        },
      },
      'test',
      startedAt,
      from,
      undefined,
      loggingSystemMock.createLogger(),
      threshold,
      '1234',
      undefined,
      sampleThresholdSignalHistory()
    );
    const _id = calculateThresholdSignalUuid('1234', startedAt, [], '');
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
              '@timestamp': '2020-04-20T21:27:45+0000',
              threshold_result: {
                from: new Date('2020-12-17T16:27:00.000Z'),
                terms: [],
                cardinality: [
                  {
                    field: 'destination.ip',
                    value: 7,
                  },
                ],
                count: 15,
              },
            },
          },
        ],
      },
    });
  });
});
