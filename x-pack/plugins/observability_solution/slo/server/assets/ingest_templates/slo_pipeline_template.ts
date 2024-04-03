/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLO_RESOURCES_VERSION } from '../../../common/constants';

export const getSLOPipelineTemplate = (id: string, indexNamePrefix: string) => ({
  id,
  description: 'Ingest pipeline for SLO rollup data',
  processors: [
    {
      set: {
        field: 'event.ingested',
        value: '{{{_ingest.timestamp}}}',
      },
    },
    {
      date_index_name: {
        field: '@timestamp',
        index_name_prefix: indexNamePrefix,
        date_rounding: 'M',
        date_formats: ['UNIX_MS', 'ISO8601', "yyyy-MM-dd'T'HH:mm:ss.SSSXX"],
      },
    },
  ],
  _meta: {
    description: 'Ingest pipeline for SLO rollup data',
    version: SLO_RESOURCES_VERSION,
    managed: true,
    managed_by: 'observability',
  },
});
