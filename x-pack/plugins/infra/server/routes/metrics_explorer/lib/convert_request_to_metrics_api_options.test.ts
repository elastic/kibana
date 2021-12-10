/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsExplorerRequestBody, MetricsAPIRequest } from '../../../../common/http_api';
import { convertRequestToMetricsAPIOptions } from './convert_request_to_metrics_api_options';

const BASE_REQUEST: MetricsExplorerRequestBody = {
  timerange: {
    from: new Date('2020-01-01T00:00:00Z').getTime(),
    to: new Date('2020-01-01T01:00:00Z').getTime(),
    interval: '1m',
  },
  limit: 9,
  indexPattern: 'metrics-*',
  metrics: [{ aggregation: 'avg', field: 'system.cpu.user.pct' }],
};

const BASE_METRICS_UI_OPTIONS: MetricsAPIRequest = {
  timerange: {
    from: new Date('2020-01-01T00:00:00Z').getTime(),
    to: new Date('2020-01-01T01:00:00Z').getTime(),
    interval: '1m',
  },
  limit: 9,
  dropPartialBuckets: true,
  indexPattern: 'metrics-*',
  metrics: [
    { id: 'metric_0', aggregations: { metric_0: { avg: { field: 'system.cpu.user.pct' } } } },
  ],
};

describe('convertRequestToMetricsAPIOptions', () => {
  it('should just work', () => {
    expect(convertRequestToMetricsAPIOptions(BASE_REQUEST)).toEqual(BASE_METRICS_UI_OPTIONS);
  });

  it('should work with string afterKeys', () => {
    expect(convertRequestToMetricsAPIOptions({ ...BASE_REQUEST, afterKey: 'host.name' })).toEqual({
      ...BASE_METRICS_UI_OPTIONS,
      afterKey: { groupBy0: 'host.name' },
    });
  });

  it('should work with afterKey objects', () => {
    const afterKey = { groupBy0: 'host.name', groupBy1: 'cloud.availability_zone' };
    expect(
      convertRequestToMetricsAPIOptions({
        ...BASE_REQUEST,
        afterKey,
      })
    ).toEqual({
      ...BASE_METRICS_UI_OPTIONS,
      afterKey,
    });
  });

  it('should work with string group bys', () => {
    expect(
      convertRequestToMetricsAPIOptions({
        ...BASE_REQUEST,
        groupBy: 'host.name',
      })
    ).toEqual({
      ...BASE_METRICS_UI_OPTIONS,
      groupBy: ['host.name'],
    });
  });

  it('should work with group by arrays', () => {
    expect(
      convertRequestToMetricsAPIOptions({
        ...BASE_REQUEST,
        groupBy: ['host.name', 'cloud.availability_zone'],
      })
    ).toEqual({
      ...BASE_METRICS_UI_OPTIONS,
      groupBy: ['host.name', 'cloud.availability_zone'],
    });
  });

  it('should work with filterQuery json string', () => {
    const filter = { bool: { filter: [{ match: { 'host.name': 'example-01' } }] } };
    expect(
      convertRequestToMetricsAPIOptions({
        ...BASE_REQUEST,
        filterQuery: JSON.stringify(filter),
      })
    ).toEqual({
      ...BASE_METRICS_UI_OPTIONS,
      filters: [filter],
    });
  });

  it('should work with filterQuery as Lucene expressions', () => {
    const filter = `host.name: 'example-01'`;
    expect(
      convertRequestToMetricsAPIOptions({
        ...BASE_REQUEST,
        filterQuery: filter,
      })
    ).toEqual({
      ...BASE_METRICS_UI_OPTIONS,
      filters: [{ query_string: { query: filter, analyze_wildcard: true } }],
    });
  });

  it('should work with empty metrics', () => {
    expect(
      convertRequestToMetricsAPIOptions({
        ...BASE_REQUEST,
        metrics: [],
      })
    ).toEqual({
      ...BASE_METRICS_UI_OPTIONS,
      metrics: [],
    });
  });

  it('should work with empty field', () => {
    expect(
      convertRequestToMetricsAPIOptions({
        ...BASE_REQUEST,
        metrics: [{ aggregation: 'avg' }],
      })
    ).toEqual({
      ...BASE_METRICS_UI_OPTIONS,
      metrics: [],
    });
  });
});
