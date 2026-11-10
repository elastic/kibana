/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import type { ApmDataSourceWithSummary } from '../../common/data_source';
import { ApmDocumentType } from '../../common/document_type';
import { RollupInterval } from '../../common/rollup';
import { TimeRangeMetadataContext } from '../context/time_range_metadata/time_range_metadata_context';
import { FETCH_STATUS } from './use_fetcher';
import { usePreferredDataSourceAndBucketSize } from './use_preferred_data_source_and_bucket_size';

const START = '2026-01-01T00:00:00.000Z';
const ONE_HOUR_LATER = '2026-01-01T01:00:00.000Z';
const ONE_DAY_LATER = '2026-01-02T00:00:00.000Z';

// A new array of new objects each time, like every metadata response
const getSources = ({
  hasServiceTransactionMetrics = true,
}: { hasServiceTransactionMetrics?: boolean } = {}): ApmDataSourceWithSummary[] => [
  ...[RollupInterval.OneMinute, RollupInterval.TenMinutes, RollupInterval.SixtyMinutes].flatMap(
    (rollupInterval) => [
      {
        documentType: ApmDocumentType.ServiceTransactionMetric,
        rollupInterval,
        hasDocs: hasServiceTransactionMetrics,
        hasDurationSummaryField: true,
      },
      {
        documentType: ApmDocumentType.TransactionMetric,
        rollupInterval,
        hasDocs: true,
        hasDurationSummaryField: true,
      },
    ]
  ),
  {
    documentType: ApmDocumentType.TransactionEvent,
    rollupInterval: RollupInterval.None,
    hasDocs: true,
    hasDurationSummaryField: false,
  },
];

// What the provider holds; changing it and rerendering stands for a new metadata response
let metadataSources: ApmDataSourceWithSummary[] | undefined;
const mockMetadata = (sources?: ApmDataSourceWithSummary[]) => {
  metadataSources = sources;
};

const wrapper = ({ children }: { children?: React.ReactNode }) =>
  React.createElement(
    TimeRangeMetadataContext.Provider,
    {
      value: {
        data: metadataSources
          ? { isUsingServiceDestinationMetrics: false, sources: metadataSources }
          : undefined,
        status: metadataSources ? FETCH_STATUS.SUCCESS : FETCH_STATUS.LOADING,
      },
    },
    children
  );

const renderPreferred = (end: string = ONE_HOUR_LATER) =>
  renderHook(
    ({ end: hookEnd }) =>
      usePreferredDataSourceAndBucketSize({
        start: START,
        end: hookEnd,
        kuery: '',
        type: ApmDocumentType.ServiceTransactionMetric,
        numBuckets: 20,
      }),
    { initialProps: { end }, wrapper }
  );

describe('usePreferredDataSourceAndBucketSize', () => {
  it('returns null without metadata', () => {
    mockMetadata(undefined);

    const { result } = renderPreferred();

    expect(result.current).toBeNull();
  });

  it('picks the source and bucket size for the time range', () => {
    mockMetadata(getSources());

    const { result } = renderPreferred();

    expect(result.current).toEqual({
      bucketSizeInSeconds: 300,
      source: {
        documentType: ApmDocumentType.ServiceTransactionMetric,
        rollupInterval: RollupInterval.OneMinute,
        hasDocs: true,
        hasDurationSummaryField: true,
      },
    });
  });

  it('keeps the same object when refetched metadata picks the same source', () => {
    mockMetadata(getSources());
    const { result, rerender } = renderPreferred();
    const firstResult = result.current;

    mockMetadata(getSources());
    rerender({ end: ONE_HOUR_LATER });

    expect(result.current).toBe(firstResult);
  });

  it('returns a new object when refetched metadata picks another source', () => {
    mockMetadata(getSources());
    const { result, rerender } = renderPreferred();
    const firstResult = result.current;

    mockMetadata(getSources({ hasServiceTransactionMetrics: false }));
    rerender({ end: ONE_HOUR_LATER });

    expect(result.current).not.toBe(firstResult);
    expect(result.current?.source.documentType).toBe(ApmDocumentType.TransactionMetric);
  });

  it('returns a new object when the bucket size changes', () => {
    mockMetadata(getSources());
    const { result, rerender } = renderPreferred();
    const firstResult = result.current;

    rerender({ end: ONE_DAY_LATER });

    expect(result.current).not.toBe(firstResult);
    expect(result.current?.bucketSizeInSeconds).not.toBe(firstResult?.bucketSizeInSeconds);
  });
});
