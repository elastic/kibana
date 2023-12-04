/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLO_RESOURCES_VERSION } from '../../../common/slo/constants';

export const getSLOPipelineTemplate = (id: string, indexNamePrefix: string) => ({
  id,
  description: 'Monthly date-time index naming for SLO data',
  processors: [
    {
<<<<<<< Updated upstream
=======
      enrich: {
        field: 'slo.id',
        policy_name: SLO_SUMMARY_ENRICH_POLICY_NAME,
        target_field: '_enrich',
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
        field: 'slo.budgetingMethod',
        copy_from: '_enrich.slo.budgetingMethod',
      },
    },
    {
      set: {
        field: 'slo.objective.target',
        copy_from: '_enrich.slo.objective.target',
      },
    },
    {
      remove: {
        field: '_enrich',
      },
    },
    {
      set: {
        field: 'event.ingested',
        value: '{{{_ingest.timestamp}}}',
      },
    },
    {
      fingerprint: {
        fields: ['slo.partitions'],
        target_field: 'slo.instanceId',
        ignore_missing: true,
        if: "ctx?.slo?.instanceId !== '*'",
      },
    },
    {
>>>>>>> Stashed changes
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
