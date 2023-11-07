/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLO_RESOURCES_VERSION } from '../constants';

export const getSLOSummaryPipelineTemplate = (id: string) => ({
  id,
  description: 'SLO summary ingest pipeline',
  processors: [
    {
      split: {
        description: 'Split comma separated list of tags into an array',
        field: 'slo.tags',
        separator: ',',
      },
    },
    {
      set: {
        description: "if 'statusCode == 0', set status to NO_DATA",
        if: 'ctx.statusCode == 0',
        field: 'status',
        value: 'NO_DATA',
      },
    },
    {
      set: {
        description: "if 'statusCode == 1', set statusLabel to VIOLATED",
        if: 'ctx.statusCode == 1',
        field: 'status',
        value: 'VIOLATED',
      },
    },
    {
      set: {
        description: "if 'statusCode == 2', set status to DEGRADING",
        if: 'ctx.statusCode == 2',
        field: 'status',
        value: 'DEGRADING',
      },
    },
    {
      set: {
        description: "if 'statusCode == 4', set status to HEALTHY",
        if: 'ctx.statusCode == 4',
        field: 'status',
        value: 'HEALTHY',
      },
    },
  ],
  _meta: {
    description: 'SLO summary ingest pipeline',
    version: SLO_RESOURCES_VERSION,
    managed: true,
    managed_by: 'observability',
  },
});
