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
        description: "if 'status == 0', set statusLabel to NO_DATA",
        if: 'ctx.status == 0',
        field: 'statusLabel',
        value: 'NO_DATA',
      },
    },
    {
      set: {
        description: "if 'status == 1', set statusLabel to VIOLATED",
        if: 'ctx.status == 1',
        field: 'statusLabel',
        value: 'VIOLATED',
      },
    },
    {
      set: {
        description: "if 'status == 2', set statusLabel to DEGRADING",
        if: 'ctx.status == 2',
        field: 'statusLabel',
        value: 'DEGRADING',
      },
    },
    {
      set: {
        description: "if 'status == 4', set statusLabel to HEALTHY",
        if: 'ctx.status == 4',
        field: 'statusLabel',
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
