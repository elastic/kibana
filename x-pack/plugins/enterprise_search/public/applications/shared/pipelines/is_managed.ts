/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestPipeline } from '@elastic/elasticsearch/lib/api/types';

interface IngestPipelineWithMetadata extends IngestPipeline {
  _meta: {
    managed?: boolean;
    managed_by?: string;
  };
}

const isIngestPipelineWithMetadata = (
  pipeline: IngestPipeline
): pipeline is IngestPipelineWithMetadata => {
  return pipeline.hasOwnProperty('_meta');
};

export const isManagedPipeline = (pipeline: IngestPipeline): boolean => {
  if (isIngestPipelineWithMetadata(pipeline)) {
    return Boolean(pipeline._meta.managed);
  }
  return false;
};
