/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MissingRequiredError } from './error_missing_required';
import { ElasticsearchMetric } from './metrics';
import { createQuery } from './create_query';

interface Metric {
  uuidField?: string;
  timestampField: string;
}
let metric: Metric;

describe('Create Query', () => {
  beforeEach(() => {
    metric = ElasticsearchMetric.getMetricFields();
  });

  it('Allows UUID to not be passed', () => {
    const options = { metric, clusterUuid: 'cuid123' };
    expect(createQuery(options)).toEqual({
      bool: { filter: [{ term: { cluster_uuid: 'cuid123' } }] },
    });
  });

  it('Uses Elasticsearch timestamp field for start and end time range by default', () => {
    const options = {
      clusterUuid: 'cuid123',
      uuid: 'abc123',
      start: 1456826400000,
      end: 14568264010000,
      metric,
    };
    expect(createQuery(options)).toEqual({
      bool: {
        filter: [
          { term: { cluster_uuid: 'cuid123' } },
          { term: { 'source_node.uuid': 'abc123' } },
          {
            range: {
              timestamp: { format: 'epoch_millis', gte: 1456826400000, lte: 14568264010000 },
            },
          },
        ],
      },
    });
  });

  it('Injects uuid and timestamp fields dynamically, based on metric', () => {
    const options = {
      clusterUuid: 'cuid123',
      uuid: 'abc123',
      start: 1456826400000,
      end: 14568264010000,
      metric: {
        uuidField: 'testUuidField',
        timestampField: 'testTimestampField',
      },
    };
    expect(createQuery(options)).toEqual({
      bool: {
        filter: [
          { term: { cluster_uuid: 'cuid123' } },
          { term: { testUuidField: 'abc123' } },
          {
            range: {
              testTimestampField: {
                format: 'epoch_millis',
                gte: 1456826400000,
                lte: 14568264010000,
              },
            },
          },
        ],
      },
    });
  });

  it('Throws if missing metric.timestampField', () => {
    function callCreateQuery() {
      const options = { clusterUuid: 'cuid123' }; // missing metric object
      return createQuery(options);
    }
    expect(callCreateQuery).toThrowError(MissingRequiredError);
  });

  it('Throws if given uuid but missing metric.uuidField', () => {
    function callCreateQuery() {
      const options = { uuid: 'abc123', clusterUuid: 'cuid123', metric };
      delete options.metric.uuidField;
      return createQuery(options);
    }
    expect(callCreateQuery).toThrowError(MissingRequiredError);
  });

  it('Uses `type` option to add type filter with minimal fields', () => {
    const options = { type: 'cluster_stats', clusterUuid: 'cuid123', metric };
    expect(createQuery(options)).toEqual({
      bool: {
        filter: [
          { bool: { should: [{ term: { type: 'cluster_stats' } }] } },
          { term: { cluster_uuid: 'cuid123' } },
        ],
      },
    });
  });

  it('Uses `type` option to add type filter with all other option fields and no data stream fields', () => {
    const options = {
      type: 'cluster_stats',
      clusterUuid: 'cuid123',
      uuid: 'abc123',
      start: 1456826400000,
      end: 14568264000000,
      metric,
    };
    expect(createQuery(options)).toEqual({
      bool: {
        filter: [
          { bool: { should: [{ term: { type: 'cluster_stats' } }] } },
          { term: { cluster_uuid: 'cuid123' } },
          { term: { 'source_node.uuid': 'abc123' } },
          {
            range: {
              timestamp: { format: 'epoch_millis', gte: 1456826400000, lte: 14568264000000 },
            },
          },
        ],
      },
    });
  });

  it('Uses `dsType` option to add filter with all other option fields', () => {
    const options = {
      dsDataset: 'elasticsearch.cluster_stats',
      clusterUuid: 'cuid123',
      uuid: 'abc123',
      start: 1456826400000,
      end: 14568264000000,
      metric,
    };
    expect(createQuery(options)).toEqual({
      bool: {
        filter: [
          {
            bool: {
              should: [{ term: { 'data_stream.dataset': 'elasticsearch.cluster_stats' } }],
            },
          },
          { term: { cluster_uuid: 'cuid123' } },
          { term: { 'source_node.uuid': 'abc123' } },
          {
            range: {
              timestamp: { format: 'epoch_millis', gte: 1456826400000, lte: 14568264000000 },
            },
          },
        ],
      },
    });
  });

  it('Uses legacy `type`, `dsDataset`, `metricset` options to add type filters and data stream filters with minimal fields that defaults to `metrics` data_stream', () => {
    const options = {
      type: 'cluster_stats',
      metricset: 'cluster_stats',
      dsDataset: 'elasticsearch.cluster_stats',
      clusterUuid: 'cuid123',
      metric,
    };
    expect(createQuery(options)).toEqual({
      bool: {
        filter: [
          {
            bool: {
              should: [
                {
                  term: {
                    'data_stream.dataset': 'elasticsearch.cluster_stats',
                  },
                },
                {
                  term: {
                    'metricset.name': 'cluster_stats',
                  },
                },
                { term: { type: 'cluster_stats' } },
              ],
            },
          },
          { term: { cluster_uuid: 'cuid123' } },
        ],
      },
    });
  });

  it('Uses legacy `type`, `metricset`, `dsDataset`, and `filters` options', () => {
    const options = {
      type: 'cluster_stats',
      metricset: 'cluster_stats',
      dsDataset: 'elasticsearch.cluster_stats',
      clusterUuid: 'cuid123',
      metric,
      filters: [
        {
          term: { 'source_node.uuid': `nuid123` },
        },
      ],
    };
    expect(createQuery(options)).toEqual({
      bool: {
        filter: [
          {
            bool: {
              should: [
                { term: { 'data_stream.dataset': 'elasticsearch.cluster_stats' } },
                { term: { 'metricset.name': 'cluster_stats' } },
                { term: { type: 'cluster_stats' } },
              ],
            },
          },
          { term: { cluster_uuid: 'cuid123' } },
          { term: { 'source_node.uuid': 'nuid123' } },
        ],
      },
    });
  });
});
