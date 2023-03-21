/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  CSP_INGEST_TIMESTAMP_PIPELINE,
  CSP_LATEST_FINDINGS_INGEST_TIMESTAMP_PIPELINE,
} from '../../common/constants';

export const scorePipelineIngestConfig: IngestPutPipelineRequest = {
  id: CSP_INGEST_TIMESTAMP_PIPELINE,
  description: 'Pipeline for adding event timestamp',
  processors: [
    {
      set: {
        field: '@timestamp',
        value: '{{_ingest.timestamp}}',
      },
    },
  ],
  on_failure: [
    {
      set: {
        field: 'error.message',
        value: '{{ _ingest.on_failure_message }}',
      },
    },
  ],
};

export const latestFindingsPipelineIngestConfig: IngestPutPipelineRequest = {
  id: CSP_LATEST_FINDINGS_INGEST_TIMESTAMP_PIPELINE,
  description: 'Pipeline for cloudbeat latest findings index',
  processors: [
    {
      set: {
        field: 'event.ingested',
        value: '{{_ingest.timestamp}}',
      },
    },
  ],
  on_failure: [
    {
      set: {
        field: 'error.message',
        value: '{{ _ingest.on_failure_message }}',
      },
    },
  ],
};
