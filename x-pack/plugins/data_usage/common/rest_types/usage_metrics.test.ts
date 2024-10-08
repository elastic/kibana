/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageMetricsRequestSchema } from './usage_metrics';

describe('usage_metrics schemas', () => {
  it('should accept valid request query', () => {
    expect(() =>
      UsageMetricsRequestSchema.query.validate({
        from: new Date().toISOString(),
        to: new Date().toISOString(),
        metricTypes: ['storage_retained'],
      })
    ).not.toThrow();
  });

  it('should accept a single `metricTypes` in request query', () => {
    expect(() =>
      UsageMetricsRequestSchema.query.validate({
        from: new Date().toISOString(),
        to: new Date().toISOString(),
        metricTypes: 'ingest_rate',
      })
    ).not.toThrow();
  });

  it('should accept multiple `metricTypes` in request query', () => {
    expect(() =>
      UsageMetricsRequestSchema.query.validate({
        from: new Date().toISOString(),
        to: new Date().toISOString(),
        metricTypes: ['ingest_rate', 'storage_retained', 'index_rate'],
      })
    ).not.toThrow();
  });

  it('should accept a single string as `dataStreams` in request query', () => {
    expect(() =>
      UsageMetricsRequestSchema.query.validate({
        from: new Date().toISOString(),
        to: new Date().toISOString(),
        metricTypes: 'storage_retained',
        dataStreams: 'data_stream_1',
      })
    ).not.toThrow();
  });

  it('should accept `dataStream` list', () => {
    expect(() =>
      UsageMetricsRequestSchema.query.validate({
        from: new Date().toISOString(),
        to: new Date().toISOString(),
        metricTypes: ['storage_retained'],
        dataStreams: ['data_stream_1', 'data_stream_2', 'data_stream_3'],
      })
    ).not.toThrow();
  });

  it('should error if `dataStream` list is empty', () => {
    expect(() =>
      UsageMetricsRequestSchema.query.validate({
        from: new Date().toISOString(),
        to: new Date().toISOString(),
        metricTypes: ['storage_retained'],
        dataStreams: [],
      })
    ).toThrowError('expected value of type [string] but got [Array]');
  });

  it('should error if `dataStream` is given an empty string', () => {
    expect(() =>
      UsageMetricsRequestSchema.query.validate({
        from: new Date().toISOString(),
        to: new Date().toISOString(),
        metricTypes: ['storage_retained'],
        dataStreams: '  ',
      })
    ).toThrow('[dataStreams] must have at least one value');
  });

  it('should error if `dataStream` is given an empty item in the list', () => {
    expect(() =>
      UsageMetricsRequestSchema.query.validate({
        from: new Date().toISOString(),
        to: new Date().toISOString(),
        metricTypes: ['storage_retained'],
        dataStreams: ['ds_1', '  '],
      })
    ).toThrow('[dataStreams] list can not contain empty values');
  });

  it('should error if `metricTypes` is empty string', () => {
    expect(() =>
      UsageMetricsRequestSchema.query.validate({
        from: new Date().toISOString(),
        to: new Date().toISOString(),
        metricTypes: ' ',
      })
    ).toThrow();
  });

  it('should error if `metricTypes` is empty item', () => {
    expect(() =>
      UsageMetricsRequestSchema.query.validate({
        from: new Date().toISOString(),
        to: new Date().toISOString(),
        metricTypes: [' ', 'storage_retained'],
      })
    ).toThrow('[metricTypes] list can not contain empty values');
  });

  it('should error if `metricTypes` is not a valid value', () => {
    expect(() =>
      UsageMetricsRequestSchema.query.validate({
        from: new Date().toISOString(),
        to: new Date().toISOString(),
        metricTypes: 'foo',
      })
    ).toThrow(
      '[metricTypes] must be one of storage_retained, ingest_rate, search_vcu, ingest_vcu, ml_vcu, index_latency, index_rate, search_latency, search_rate'
    );
  });

  it('should error if `metricTypes` is not a valid list', () => {
    expect(() =>
      UsageMetricsRequestSchema.query.validate({
        from: new Date().toISOString(),
        to: new Date().toISOString(),
        metricTypes: ['storage_retained', 'foo'],
      })
    ).toThrow(
      '[metricTypes] must be one of storage_retained, ingest_rate, search_vcu, ingest_vcu, ml_vcu, index_latency, index_rate, search_latency, search_rate'
    );
  });

  it('should error if `from` is not a valid input', () => {
    expect(() =>
      UsageMetricsRequestSchema.query.validate({
        from: 1010,
        to: new Date().toISOString(),
        metricTypes: ['storage_retained', 'foo'],
      })
    ).toThrow('[from]: expected value of type [string] but got [number]');
  });

  it('should error if `to` is not a valid input', () => {
    expect(() =>
      UsageMetricsRequestSchema.query.validate({
        from: new Date().toISOString(),
        to: 1010,
        metricTypes: ['storage_retained', 'foo'],
      })
    ).toThrow('[to]: expected value of type [string] but got [number]');
  });

  it('should error if `from` is empty string', () => {
    expect(() =>
      UsageMetricsRequestSchema.query.validate({
        from: ' ',
        to: new Date().toISOString(),
        metricTypes: ['storage_retained', 'foo'],
      })
    ).toThrow('[from]: Date ISO string must not be empty');
  });

  it('should error if `to` is empty string', () => {
    expect(() =>
      UsageMetricsRequestSchema.query.validate({
        from: new Date().toISOString(),
        to: '   ',
        metricTypes: ['storage_retained', 'foo'],
      })
    ).toThrow('[to]: Date ISO string must not be empty');
  });
});
