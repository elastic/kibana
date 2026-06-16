/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { getPreferredBucketSizeAndDataSource } from '@kbn/apm-data-access-plugin/common';
import {
  apmQueryQualityGraphs,
  apmQueryQualityTables,
  getAdjustedNumBuckets,
  getNumBucketsMultiplier,
  QueryQualityLevel,
} from '@kbn/observability-plugin/common';
import type { ApmDataSourceWithSummary } from '../../common/data_source';
import { ApmDocumentType } from '../../common/document_type';
import { getBucketSize } from '../../common/utils/get_bucket_size';
import { useApmPluginContext } from '../context/apm_plugin/use_apm_plugin_context';
import { useTimeRangeMetadata } from '../context/time_range_metadata/use_time_range_metadata_context';

/**
 * Hook to get the source and interval based on Time Range Metadata API
 *
 * @param {number} numBuckets - The base number of buckets. Typically 20 for SparkPlots or 100 for charts.
 * Adjusted at runtime by the query quality advanced setting that matches the given `intent`.
 * @param {'graph' | 'table'} intent - Which query quality setting governs this call. Charts and
 * SparkPlots use `'graph'`; table numeric columns (backed by `main_statistics` / `detailed_statistics`)
 * use `'table'`.
 */

export function usePreferredDataSourceAndBucketSize<
  TDocumentType extends ApmDocumentType.ServiceTransactionMetric | ApmDocumentType.TransactionMetric
>({
  start,
  end,
  kuery,
  numBuckets,
  type,
  intent,
}: {
  start: string;
  end: string;
  kuery: string;
  numBuckets: 20 | 100;
  type: TDocumentType;
  intent: 'graph' | 'table';
}): {
  bucketSizeInSeconds: number;
  source: ApmDataSourceWithSummary<
    TDocumentType extends ApmDocumentType.ServiceTransactionMetric
      ?
          | ApmDocumentType.ServiceTransactionMetric
          | ApmDocumentType.TransactionMetric
          | ApmDocumentType.TransactionEvent
      : ApmDocumentType.TransactionMetric | ApmDocumentType.TransactionEvent
  >;
} | null {
  const timeRangeMetadataFetch = useTimeRangeMetadata({
    start,
    end,
    kuery,
  });

  const {
    core: { uiSettings },
  } = useApmPluginContext();

  const qualityLevel =
    uiSettings.get<QueryQualityLevel>(
      intent === 'graph' ? apmQueryQualityGraphs : apmQueryQualityTables
    ) ?? QueryQualityLevel.default;

  const adjustedNumBuckets = getAdjustedNumBuckets(
    numBuckets,
    getNumBucketsMultiplier(qualityLevel)
  );

  const sources = timeRangeMetadataFetch.data?.sources;

  return useMemo(() => {
    if (!sources) {
      return null;
    }

    let suitableTypes: ApmDocumentType[];

    if (type === ApmDocumentType.ServiceTransactionMetric) {
      suitableTypes = [
        ApmDocumentType.ServiceTransactionMetric,
        ApmDocumentType.TransactionMetric,
        ApmDocumentType.TransactionEvent,
      ];
    } else if (type === ApmDocumentType.TransactionMetric) {
      suitableTypes = [ApmDocumentType.TransactionMetric, ApmDocumentType.TransactionEvent];
    }

    const { bucketSizeInSeconds, source } = getPreferredBucketSizeAndDataSource({
      bucketSizeInSeconds: getBucketSize({
        numBuckets: adjustedNumBuckets,
        start: new Date(start).getTime(),
        end: new Date(end).getTime(),
      }).bucketSize,
      sources: sources.filter((s) => suitableTypes.includes(s.documentType)),
    });

    return {
      bucketSizeInSeconds,
      source: source as ApmDataSourceWithSummary<any>,
    };
  }, [type, start, end, sources, adjustedNumBuckets]);
}
