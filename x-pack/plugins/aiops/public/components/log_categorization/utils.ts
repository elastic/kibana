/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringHash } from '@kbn/ml-string-hash';
import type { DocumentStats } from '../../hooks/use_document_count_stats';

/**
 * Creates a hash from the document stats to determine if the document stats have changed.
 */
export function createDocumentStatsHash(
  documentStats: DocumentStats,
  additionalStrings: string[] = []
) {
  const lastTimeStampMs = documentStats.documentCountStats?.lastDocTimeStampMs;
  const totalCount = documentStats.documentCountStats?.totalCount;
  const times = Object.keys(documentStats.documentCountStats?.buckets ?? {});
  const firstBucketTimeStamp = times.length ? times[0] : undefined;
  const lastBucketTimeStamp = times.length ? times[times.length - 1] : undefined;
  return stringHash(
    `${lastTimeStampMs}${totalCount}${firstBucketTimeStamp}${lastBucketTimeStamp}${additionalStrings.join(
      ''
    )}`
  );
}
