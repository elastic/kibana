/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLO_RESOURCES_VERSION } from '../constants';

export const getSLOPipelineTemplate = (id: string, indexNamePrefix: string) => ({
  id,
  description: 'Monthly date-time index naming for SLO data',
  processors: [
    {
      date_index_name: {
        field: '@timestamp',
        index_name_prefix: indexNamePrefix,
        date_rounding: 'M',
      },
    },
  ],
  _meta: {
    description: 'SLO ingest pipeline',
    version: SLO_RESOURCES_VERSION,
    managed: true,
    managed_by: 'observability',
  },
});
