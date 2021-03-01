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
import { normalizeThresholdField } from '../../../../common/detection_engine/utils';
import {
  Threshold,
  ThresholdNormalized,
} from '../../../../common/detection_engine/schemas/common/schemas';

describe('transformThresholdNormalizedResultsToEcs', () => {
  it('should return transformed threshold results for pre-7.12 rules', () => {
    const threshold: Threshold = {
      field: 'source.ip',
      value: 1,
    };
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
      {
        ...threshold,
        field: normalizeThresholdField(threshold.field),
      },
      '1234',
      undefined
    );
    const _id = calculateThresholdSignalUuid('1234', startedAt, ['source.ip'], '127.0.0.1');
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
                terms: [
                  {
                    field: 'source.ip',
                    value: '127.0.0.1',
                  },
                ],
                cardinality: undefined,
                count: 15,
              },
            },
          },
        ],
      },
    });
  });

  it('should return transformed threshold results for pre-7.12 rules without threshold field', () => {
    const threshold: Threshold = {
      field: '',
      value: 1,
    };
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
              },
            ],
          },
        },
      },
      'test',
      startedAt,
      undefined,
      loggingSystemMock.createLogger(),
      {
        ...threshold,
        field: normalizeThresholdField(threshold.field),
      },
      '1234',
      undefined
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
                terms: [],
                cardinality: undefined,
                count: 15,
              },
            },
          },
        ],
      },
    });
  });

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
      undefined,
      loggingSystemMock.createLogger(),
      threshold,
      '1234',
      undefined
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
              threshold_result: {
                terms: [
                  {
                    field: 'source.ip',
                    value: '127.0.0.1',
                  },
                  {
                    field: 'host.name',
                    value: 'garden-gnomes',
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
      undefined,
      loggingSystemMock.createLogger(),
      threshold,
      '1234',
      undefined
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
