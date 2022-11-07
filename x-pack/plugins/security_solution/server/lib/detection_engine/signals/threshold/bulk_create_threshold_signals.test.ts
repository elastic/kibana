/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ThresholdNormalized } from '../../../../../common/detection_engine/rule_schema';
import { calculateThresholdSignalUuid } from '../utils';
import { getTransformedHits } from './bulk_create_threshold_signals';

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
    const transformedResults = getTransformedHits(
      [
        {
          key: {
            'source.ip': '127.0.0.1',
            'host.name': 'garden-gnomes',
          },
          doc_count: 12,
          max_timestamp: {
            value: 1608222603,
            value_as_string: '2020-12-17T16:30:03.000Z',
          },
          min_timestamp: {
            value: 1608222483,
            value_as_string: '2020-12-17T16:28:03.000Z',
          },
          cardinality_count: {
            value: 7,
          },
        },
      ],
      'test',
      startedAt,
      from,
      threshold,
      '1234'
    );
    const _id = calculateThresholdSignalUuid(
      '1234',
      startedAt,
      ['source.ip', 'host.name'],
      '127.0.0.1,garden-gnomes'
    );
    expect(transformedResults).toEqual([
      {
        _id,
        _index: 'test',
        _source: {
          '@timestamp': '2020-12-17T16:30:03.000Z',
          'host.name': 'garden-gnomes',
          'source.ip': '127.0.0.1',
          threshold_result: {
            from: new Date('2020-12-17T16:28:03.000Z'), // from min_timestamp
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
    ]);
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
    const transformedResults = getTransformedHits([], 'test', startedAt, from, threshold, '1234');
    expect(transformedResults).toEqual([]);
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
    const transformedResults = getTransformedHits(
      [
        {
          key: {},
          doc_count: 15,
          max_timestamp: {
            value: 1608222603,
            value_as_string: '2020-12-17T16:30:03.000Z',
          },
          min_timestamp: {
            value: 1608222483,
            value_as_string: '2020-12-17T16:28:03.000Z',
          },
          cardinality_count: {
            value: 7,
          },
        },
      ],
      'test',
      startedAt,
      from,
      threshold,
      '1234'
    );
    const _id = calculateThresholdSignalUuid('1234', startedAt, [], '');
    expect(transformedResults).toEqual([
      {
        _id,
        _index: 'test',
        _source: {
          '@timestamp': '2020-12-17T16:30:03.000Z',
          threshold_result: {
            from: new Date('2020-12-17T16:28:03.000Z'),
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
    ]);
  });
});
