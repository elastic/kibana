/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getBucketSize, type TimeRangeMetadata } from '../../../common';
import { getPreferredBucketSizeAndDataSource } from '../../../common/utils/get_preferred_bucket_size_and_data_source';
import { ApmDocumentType } from '../../../common/document_type';
import { getConfigForDocumentType } from '../../lib/helpers/create_es_client/document_type';

export interface GetDocumentTypeParams {
  start: number;
  end: number;
  documentSources: TimeRangeMetadata['sources'];
  documentTypes: ApmDocumentType[];
  numBuckets?: number;
}

export function getDocumentTypeConfig({
  start,
  end,
  numBuckets,
  documentTypes,
  documentSources,
}: GetDocumentTypeParams) {
  const preferredSource = getPreferredBucketSizeAndDataSource({
    sources: documentSources.filter((s) => documentTypes.includes(s.documentType)),
    bucketSizeInSeconds: getBucketSize({ start, end, numBuckets }).bucketSize,
  });
  const documentTypeConfig = getConfigForDocumentType(preferredSource.source.documentType);

  return { preferredSource, documentTypeConfig };
}
