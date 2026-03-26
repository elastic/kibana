/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isCCSRemoteIndexName } from '@kbn/es-query';
import { ERROR_CORRELATION_THRESHOLD } from '../../../../common/correlations/constants';
import type { FailedTransactionsCorrelation } from '../../../../common/correlations/failed_transactions_correlations/types';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { fetchPValues } from './fetch_p_values';
import { fetchDurationHistogramRangeSteps } from './fetch_duration_histogram_range_steps';
import { fetchFailedEventsCorrelationPValues } from './fetch_failed_events_correlation_p_values';

jest.mock('./fetch_duration_histogram_range_steps');
jest.mock('./fetch_failed_events_correlation_p_values');
jest.mock('@kbn/es-query');

const mockFetchDurationHistogramRangeSteps =
  fetchDurationHistogramRangeSteps as jest.MockedFunction<typeof fetchDurationHistogramRangeSteps>;
const mockFetchFailedEventsCorrelationPValues =
  fetchFailedEventsCorrelationPValues as jest.MockedFunction<
    typeof fetchFailedEventsCorrelationPValues
  >;
const mockIsCCSRemoteIndexName = isCCSRemoteIndexName as jest.MockedFunction<
  typeof isCCSRemoteIndexName
>;

describe('fetchPValues', () => {
  const mockApmEventClient = {
    search: jest.fn(),
    indices: {
      transaction: 'apm-*-transaction-*',
      error: 'apm-*-error-*',
      span: 'apm-*-span-*',
      metric: 'apm-*-metric-*',
      onboarding: 'apm-*-onboarding-*',
      sourcemap: 'apm-*-sourcemap-*',
    },
  } as unknown as APMEventClient;

  const defaultParams = {
    apmEventClient: mockApmEventClient,
    start: 0,
    end: 1000000,
    environment: 'production',
    kuery: '',
    query: { match_all: {} },
    fieldCandidates: ['service.version', 'service.environment'],
  };

  beforeEach(() => {
    jest.resetAllMocks();
    mockIsCCSRemoteIndexName.mockReturnValue(false);
  });

  it('should return failed transactions correlations when pValues are below threshold', async () => {
    const rangeSteps = [100, 200, 300, 400, 500];
    mockFetchDurationHistogramRangeSteps.mockResolvedValue({
      rangeSteps,
      durationMin: 100,
      durationMax: 500,
    });

    const correlation1: FailedTransactionsCorrelation = {
      fieldName: 'service.version',
      fieldValue: '1.0.0',
      doc_count: 10,
      bg_count: 20,
      score: 5.0,
      pValue: 0.01,
      normalizedScore: 0.5,
      failurePercentage: 0.5,
      successPercentage: 0.5,
      histogram: [],
    };

    const correlation2: FailedTransactionsCorrelation = {
      fieldName: 'service.environment',
      fieldValue: 'production',
      doc_count: 15,
      bg_count: 30,
      score: 4.5,
      pValue: 0.015,
      normalizedScore: 0.6,
      failurePercentage: 0.5,
      successPercentage: 0.5,
      histogram: [],
    };

    mockFetchFailedEventsCorrelationPValues
      .mockResolvedValueOnce([correlation1])
      .mockResolvedValueOnce([correlation2]);

    const result = await fetchPValues(defaultParams);

    expect(result.failedTransactionsCorrelations).toHaveLength(2);
    expect(result.failedTransactionsCorrelations).toContainEqual(correlation1);
    expect(result.failedTransactionsCorrelations).toContainEqual(correlation2);
    expect(result.ccsWarning).toBe(false);
    expect(result.fallbackResult).toBeUndefined();
  });

  it('should filter out correlations with pValues above threshold', async () => {
    const rangeSteps = [100, 200, 300];
    mockFetchDurationHistogramRangeSteps.mockResolvedValue({
      rangeSteps,
      durationMin: 100,
      durationMax: 300,
    });

    const correlationBelowThreshold: FailedTransactionsCorrelation = {
      fieldName: 'service.version',
      fieldValue: '1.0.0',
      doc_count: 10,
      bg_count: 20,
      score: 5.0,
      pValue: 0.01,
      normalizedScore: 0.5,
      failurePercentage: 0.5,
      successPercentage: 0.5,
      histogram: [],
    };

    const correlationAboveThreshold: FailedTransactionsCorrelation = {
      fieldName: 'service.environment',
      fieldValue: 'production',
      doc_count: 15,
      bg_count: 30,
      score: 2.0,
      pValue: 0.05,
      normalizedScore: 0.3,
      failurePercentage: 0.5,
      successPercentage: 0.5,
      histogram: [],
    };

    mockFetchFailedEventsCorrelationPValues
      .mockResolvedValueOnce([correlationBelowThreshold])
      .mockResolvedValueOnce([correlationAboveThreshold]);

    const result = await fetchPValues(defaultParams);

    expect(result.failedTransactionsCorrelations).toHaveLength(1);
    expect(result.failedTransactionsCorrelations[0]).toEqual(correlationBelowThreshold);
    expect(result.fallbackResult).toEqual(correlationAboveThreshold);
  });

  it('should filter out correlations with null pValues', async () => {
    const rangeSteps = [100, 200];
    mockFetchDurationHistogramRangeSteps.mockResolvedValue({
      rangeSteps,
      durationMin: 100,
      durationMax: 200,
    });

    const correlationWithNullPValue: FailedTransactionsCorrelation = {
      fieldName: 'service.version',
      fieldValue: '1.0.0',
      doc_count: 10,
      bg_count: 20,
      score: 5.0,
      pValue: null,
      normalizedScore: 0.5,
      failurePercentage: 0.5,
      successPercentage: 0.5,
      histogram: [],
    };

    mockFetchFailedEventsCorrelationPValues
      .mockResolvedValueOnce([correlationWithNullPValue])
      .mockResolvedValueOnce([]);

    const result = await fetchPValues(defaultParams);

    expect(result.failedTransactionsCorrelations).toHaveLength(0);
    expect(result.fallbackResult).toEqual(correlationWithNullPValue);
  });

  it('should select the best fallback result when multiple correlations are above threshold', async () => {
    const rangeSteps = [100, 200];
    mockFetchDurationHistogramRangeSteps.mockResolvedValue({
      rangeSteps,
      durationMin: 100,
      durationMax: 200,
    });

    const correlation1: FailedTransactionsCorrelation = {
      fieldName: 'service.version',
      fieldValue: '1.0.0',
      doc_count: 10,
      bg_count: 20,
      score: 3.0,
      pValue: 0.05,
      normalizedScore: 0.3,
      failurePercentage: 0.5,
      successPercentage: 0.5,
      histogram: [],
    };

    const correlation2: FailedTransactionsCorrelation = {
      fieldName: 'service.environment',
      fieldValue: 'production',
      doc_count: 15,
      bg_count: 30,
      score: 2.5,
      pValue: 0.08,
      normalizedScore: 0.25,
      failurePercentage: 0.5,
      successPercentage: 0.5,
      histogram: [],
    };

    const correlation3: FailedTransactionsCorrelation = {
      fieldName: 'service.name',
      fieldValue: 'my-service',
      doc_count: 20,
      bg_count: 40,
      score: 2.0,
      pValue: 0.135,
      normalizedScore: 0.2,
      failurePercentage: 0.5,
      successPercentage: 0.5,
      histogram: [],
    };

    mockFetchFailedEventsCorrelationPValues
      .mockResolvedValueOnce([correlation1])
      .mockResolvedValueOnce([correlation2])
      .mockResolvedValueOnce([correlation3]);

    const result = await fetchPValues({
      ...defaultParams,
      fieldCandidates: ['service.version', 'service.environment', 'service.name'],
    });

    expect(result.failedTransactionsCorrelations).toHaveLength(0);
    expect(result.fallbackResult).toEqual(correlation1);
  });

  it('should handle empty results', async () => {
    const rangeSteps = [100, 200];
    mockFetchDurationHistogramRangeSteps.mockResolvedValue({
      rangeSteps,
      durationMin: 100,
      durationMax: 200,
    });

    mockFetchFailedEventsCorrelationPValues.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const result = await fetchPValues(defaultParams);

    expect(result.failedTransactionsCorrelations).toHaveLength(0);
    expect(result.ccsWarning).toBe(false);
    expect(result.fallbackResult).toBeUndefined();
  });

  it('should handle multiple correlations per field candidate', async () => {
    const rangeSteps = [100, 200];
    mockFetchDurationHistogramRangeSteps.mockResolvedValue({
      rangeSteps,
      durationMin: 100,
      durationMax: 200,
    });

    const correlation1: FailedTransactionsCorrelation = {
      fieldName: 'service.version',
      fieldValue: '1.0.0',
      doc_count: 10,
      bg_count: 20,
      score: 5.0,
      pValue: 0.01,
      normalizedScore: 0.5,
      failurePercentage: 0.5,
      successPercentage: 0.5,
      histogram: [],
    };

    const correlation2: FailedTransactionsCorrelation = {
      fieldName: 'service.version',
      fieldValue: '2.0.0',
      doc_count: 5,
      bg_count: 10,
      score: 4.0,
      pValue: 0.018,
      normalizedScore: 0.4,
      failurePercentage: 0.5,
      successPercentage: 0.5,
      histogram: [],
    };

    mockFetchFailedEventsCorrelationPValues.mockResolvedValueOnce([correlation1, correlation2]);
    mockFetchFailedEventsCorrelationPValues.mockResolvedValueOnce([]);

    const result = await fetchPValues(defaultParams);

    expect(result.failedTransactionsCorrelations).toHaveLength(2);
    expect(result.failedTransactionsCorrelations).toContainEqual(correlation1);
    expect(result.failedTransactionsCorrelations).toContainEqual(correlation2);
  });

  it('should set ccsWarning to true when there are rejected promises and index is remote', async () => {
    const rangeSteps = [100, 200];
    mockFetchDurationHistogramRangeSteps.mockResolvedValue({
      rangeSteps,
      durationMin: 100,
      durationMax: 200,
    });

    mockIsCCSRemoteIndexName.mockReturnValue(true);

    const correlation: FailedTransactionsCorrelation = {
      fieldName: 'service.version',
      fieldValue: '1.0.0',
      doc_count: 10,
      bg_count: 20,
      score: 5.0,
      pValue: 0.01,
      normalizedScore: 0.5,
      failurePercentage: 0.5,
      successPercentage: 0.5,
      histogram: [],
    };

    mockFetchFailedEventsCorrelationPValues
      .mockResolvedValueOnce([correlation])
      .mockRejectedValueOnce(new Error('Search failed'));

    const result = await fetchPValues(defaultParams);

    expect(result.ccsWarning).toBe(true);
    expect(result.failedTransactionsCorrelations).toHaveLength(1);
    expect(mockIsCCSRemoteIndexName).toHaveBeenCalledWith('apm-*-transaction-*');
  });

  it('should set ccsWarning to false when there are rejected promises but index is not remote', async () => {
    const rangeSteps = [100, 200];
    mockFetchDurationHistogramRangeSteps.mockResolvedValue({
      rangeSteps,
      durationMin: 100,
      durationMax: 200,
    });

    mockIsCCSRemoteIndexName.mockReturnValue(false);

    const correlation: FailedTransactionsCorrelation = {
      fieldName: 'service.version',
      fieldValue: '1.0.0',
      doc_count: 10,
      bg_count: 20,
      score: 5.0,
      pValue: 0.01,
      normalizedScore: 0.5,
      failurePercentage: 0.5,
      successPercentage: 0.5,
      histogram: [],
    };

    mockFetchFailedEventsCorrelationPValues
      .mockResolvedValueOnce([correlation])
      .mockRejectedValueOnce(new Error('Search failed'));

    const result = await fetchPValues(defaultParams);

    expect(result.ccsWarning).toBe(false);
  });

  it('should set ccsWarning to false when there are no rejected promises', async () => {
    const rangeSteps = [100, 200];
    mockFetchDurationHistogramRangeSteps.mockResolvedValue({
      rangeSteps,
      durationMin: 100,
      durationMax: 200,
    });

    const correlation: FailedTransactionsCorrelation = {
      fieldName: 'service.version',
      fieldValue: '1.0.0',
      doc_count: 10,
      bg_count: 20,
      score: 5.0,
      pValue: 0.01,
      normalizedScore: 0.5,
      failurePercentage: 0.5,
      successPercentage: 0.5,
      histogram: [],
    };

    mockFetchFailedEventsCorrelationPValues
      .mockResolvedValueOnce([correlation])
      .mockResolvedValueOnce([]);

    const result = await fetchPValues(defaultParams);

    expect(result.ccsWarning).toBe(false);
  });

  it('should handle pValue exactly at threshold', async () => {
    const rangeSteps = [100, 200];
    mockFetchDurationHistogramRangeSteps.mockResolvedValue({
      rangeSteps,
      durationMin: 100,
      durationMax: 200,
    });

    const correlationAtThreshold: FailedTransactionsCorrelation = {
      fieldName: 'service.version',
      fieldValue: '1.0.0',
      doc_count: 10,
      bg_count: 20,
      score: 3.912,
      pValue: ERROR_CORRELATION_THRESHOLD,
      normalizedScore: 0.5,
      failurePercentage: 0.5,
      successPercentage: 0.5,
      histogram: [],
    };

    mockFetchFailedEventsCorrelationPValues
      .mockResolvedValueOnce([correlationAtThreshold])
      .mockResolvedValueOnce([]);

    const result = await fetchPValues(defaultParams);

    expect(result.failedTransactionsCorrelations).toHaveLength(0);
    expect(result.fallbackResult).toEqual(correlationAtThreshold);
  });

  it('should pass durationMin and durationMax to fetchDurationHistogramRangeSteps', async () => {
    const rangeSteps = [100, 200];
    mockFetchDurationHistogramRangeSteps.mockResolvedValue({
      rangeSteps,
      durationMin: 100,
      durationMax: 200,
    });

    mockFetchFailedEventsCorrelationPValues.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await fetchPValues({
      ...defaultParams,
      durationMin: 50,
      durationMax: 500,
    });

    expect(mockFetchDurationHistogramRangeSteps).toHaveBeenCalledWith(
      expect.objectContaining({
        durationMinOverride: 50,
        durationMaxOverride: 500,
      })
    );
  });

  it('should handle all field candidates failing', async () => {
    const rangeSteps = [100, 200];
    mockFetchDurationHistogramRangeSteps.mockResolvedValue({
      rangeSteps,
      durationMin: 100,
      durationMax: 200,
    });

    mockFetchFailedEventsCorrelationPValues
      .mockRejectedValueOnce(new Error('Field 1 failed'))
      .mockRejectedValueOnce(new Error('Field 2 failed'));

    const result = await fetchPValues(defaultParams);

    expect(result.failedTransactionsCorrelations).toHaveLength(0);
    expect(result.fallbackResult).toBeUndefined();
    expect(result.ccsWarning).toBe(false);
  });

  it('should handle mixed success and failure for field candidates', async () => {
    const rangeSteps = [100, 200];
    mockFetchDurationHistogramRangeSteps.mockResolvedValue({
      rangeSteps,
      durationMin: 100,
      durationMax: 200,
    });

    const correlation: FailedTransactionsCorrelation = {
      fieldName: 'service.version',
      fieldValue: '1.0.0',
      doc_count: 10,
      bg_count: 20,
      score: 5.0,
      pValue: 0.01,
      normalizedScore: 0.5,
      failurePercentage: 0.5,
      successPercentage: 0.5,
      histogram: [],
    };

    mockFetchFailedEventsCorrelationPValues
      .mockResolvedValueOnce([correlation])
      .mockRejectedValueOnce(new Error('Field 2 failed'));

    const result = await fetchPValues(defaultParams);

    expect(result.failedTransactionsCorrelations).toHaveLength(1);
    expect(result.failedTransactionsCorrelations[0]).toEqual(correlation);
    expect(result.ccsWarning).toBe(false);
  });
});
