/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmDocumentType } from '../../common/document_type';
import { usePreferredDataSourceAndBucketSize } from './use_preferred_data_source_and_bucket_size';

/**
 * The source for per-service stats, shared by the service inventory and the service map so both
 * read the same data.
 */
export function usePreferredServicesDataSource({
  start,
  end,
  kuery,
}: {
  start: string;
  end: string;
  kuery: string;
}): ReturnType<
  typeof usePreferredDataSourceAndBucketSize<ApmDocumentType.ServiceTransactionMetric>
> {
  return usePreferredDataSourceAndBucketSize({
    start,
    end,
    kuery,
    type: ApmDocumentType.ServiceTransactionMetric,
    numBuckets: 20,
  });
}
