/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { ApmDataSource } from '../../common/data_source';
import { ApmDocumentType } from '../../common/document_type';
import { getBucketSize } from '../../common/utils/get_bucket_size';
import { getPreferredBucketSizeAndDataSource } from '../../common/utils/get_preferred_bucket_size_and_data_source';
import { useTimeRangeMetadata } from '../context/time_range_metadata/use_time_range_metadata_context';

export function usePreferredDataSourceAndBucketSize<
  TDocumentType extends
    | ApmDocumentType.ServiceTransactionMetric
    | ApmDocumentType.TransactionMetric
>({
  start,
  end,
  kuery,
  numBuckets,
  type,
}: {
  start: string;
  end: string;
  kuery: string;
  numBuckets: 20 | 100;
  type: TDocumentType;
}): {
  bucketSizeInSeconds: number;
  source: ApmDataSource<
    TDocumentType extends ApmDocumentType.ServiceTransactionMetric
      ?
          | ApmDocumentType.ServiceTransactionMetric
          | ApmDocumentType.TransactionMetric
          | ApmDocumentType.TransactionMetric
      : ApmDocumentType.TransactionMetric | ApmDocumentType.TransactionEvent
  >;
} | null {
  const timeRangeMetadataFetch = useTimeRangeMetadata({
    start,
    end,
    kuery,
  });

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
      suitableTypes = [
        ApmDocumentType.TransactionMetric,
        ApmDocumentType.TransactionEvent,
      ];
    }

    const { bucketSizeInSeconds, source } = getPreferredBucketSizeAndDataSource(
      {
        bucketSizeInSeconds: getBucketSize({
          numBuckets,
          start: new Date(start).getTime(),
          end: new Date(end).getTime(),
        }).bucketSize,
        sources: sources.filter(
          (s) => s.hasDocs && suitableTypes.includes(s.documentType)
        ),
      }
    );

    return {
      bucketSizeInSeconds,
      source: source as ApmDataSource<any>,
    };
  }, [type, start, end, sources, numBuckets]);
}
