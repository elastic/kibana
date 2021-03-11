/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEventsHistogramQuery } from './query.events_histogram.dsl';
import {
  mockOptions,
  expectedDsl,
  expectedThresholdDsl,
  expectedThresholdMissingFieldDsl,
  expectedThresholdWithCardinalityDsl,
} from './__mocks__/';

describe('buildEventsHistogramQuery', () => {
  test('build query from options correctly', () => {
    expect(buildEventsHistogramQuery(mockOptions)).toEqual(expectedDsl);
  });

  test('builds query with just min doc if "threshold.field" is empty array and "missing" param included', () => {
    expect(
      buildEventsHistogramQuery({
        ...mockOptions,
        threshold: { field: [], value: '200', cardinality: { field: [], value: '0' } },
      })
    ).toEqual(expectedThresholdMissingFieldDsl);
  });

  test('builds query with specified threshold fields and without "missing" param if "threshold.field" is multi field', () => {
    expect(
      buildEventsHistogramQuery({
        ...mockOptions,
        threshold: {
          field: ['host.name', 'agent.name'],
          value: '200',
        },
      })
    ).toEqual(expectedThresholdDsl);
  });

  test('builds query with specified threshold cardinality if defined', () => {
    expect(
      buildEventsHistogramQuery({
        ...mockOptions,
        threshold: {
          field: [],
          value: '200',
          cardinality: { field: ['agent.name'], value: '10' },
        },
      })
    ).toEqual(expectedThresholdWithCardinalityDsl);
  });

  test('builds query with specified threshold group fields and cardinality if defined', () => {
    expect(
      buildEventsHistogramQuery({
        ...mockOptions,
        threshold: {
          field: ['host.name', 'agent.name'],
          value: '200',
          cardinality: { field: ['agent.name'], value: '10' },
        },
      })
    ).toEqual({
      allowNoIndices: true,
      body: {
        aggregations: {
          eventActionGroup: {
            aggs: {
              cardinality_check: {
                bucket_selector: {
                  buckets_path: { cardinalityCount: 'cardinality_count' },
                  script: 'params.cardinalityCount >= 10',
                },
              },
              cardinality_count: { cardinality: { field: 'agent.name' } },
              events: {
                date_histogram: {
                  extended_bounds: { max: 1599667886215, min: 1599581486215 },
                  field: '@timestamp',
                  fixed_interval: '2700000ms',
                  min_doc_count: 200,
                },
              },
            },
            terms: {
              order: { _count: 'desc' },
              script: {
                lang: 'painless',
                source: "doc['host.name'].value + ':' + doc['agent.name'].value",
              },
              size: 10,
            },
          },
        },
        query: {
          bool: {
            filter: [
              { bool: { filter: [{ match_all: {} }], must: [], must_not: [], should: [] } },
              {
                range: {
                  '@timestamp': {
                    format: 'strict_date_optional_time',
                    gte: '2020-09-08T16:11:26.215Z',
                    lte: '2020-09-09T16:11:26.215Z',
                  },
                },
              },
            ],
          },
        },
        size: 0,
      },
      ignoreUnavailable: true,
      index: [
        'apm-*-transaction*',
        'auditbeat-*',
        'endgame-*',
        'filebeat-*',
        'logs-*',
        'packetbeat-*',
        'winlogbeat-*',
      ],
      track_total_hits: true,
    });
  });
});
