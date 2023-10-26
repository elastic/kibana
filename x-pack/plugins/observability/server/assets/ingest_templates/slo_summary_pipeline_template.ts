/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLO_RESOURCES_VERSION, SLO_SUMMARY_ENRICH_POLICY_NAME } from '../constants';

export const getSLOSummaryPipelineTemplate = (id: string) => ({
  id,
  description: 'SLO summary ingest pipeline',
  processors: [
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
    {
      enrich: {
        field: 'slo.id',
        policy_name: SLO_SUMMARY_ENRICH_POLICY_NAME,
        target_field: '_enrich',
      },
    },
    {
      set: {
        field: 'slo.name',
        copy_from: '_enrich.slo.name',
      },
    },
    {
      set: {
        field: 'slo.description',
        copy_from: '_enrich.slo.description',
      },
    },
    {
      set: {
        field: 'slo.indicator',
        copy_from: '_enrich.slo.indicator',
      },
    },
    {
      set: {
        field: 'slo.timeWindow',
        copy_from: '_enrich.slo.timeWindow',
      },
    },
    {
      set: {
        field: 'slo.groupBy',
        copy_from: '_enrich.slo.groupBy',
      },
    },
    {
      set: {
        field: 'slo.tags',
        copy_from: '_enrich.slo.tags',
      },
    },
    {
      set: {
        field: 'slo.objective',
        copy_from: '_enrich.slo.objective',
      },
    },
    {
      set: {
        field: 'slo.budgetingMethod',
        copy_from: '_enrich.slo.budgetingMethod',
      },
    },
    {
      remove: {
        field: '_enrich',
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
