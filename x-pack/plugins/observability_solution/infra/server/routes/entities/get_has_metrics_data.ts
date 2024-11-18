/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { termQuery } from '@kbn/observability-plugin/server';
import { InfraMetricsClient } from '../../lib/helpers/get_infra_metrics_client';

export async function getHasMetricsData({
  infraMetricsClient,
  field,
  entityId,
}: {
  infraMetricsClient: InfraMetricsClient;
  field: string;
  entityId: string;
}) {
  const results = await infraMetricsClient.search({
    allow_no_indices: true,
    ignore_unavailable: true,
    body: {
      track_total_hits: true,
      terminate_after: 1,
      size: 0,
      query: { bool: { filter: termQuery(field, entityId) } },
    },
  });
  return results.hits.total.value !== 0;
}
