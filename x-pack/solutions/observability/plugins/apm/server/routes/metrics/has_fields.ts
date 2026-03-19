/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { SERVICE_NAME } from '../../../common/es_fields/apm';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export async function hasFields({
  apmEventClient,
  serviceName,
  fields,
}: {
  apmEventClient: APMEventClient;
  serviceName: string;
  fields: string[];
}): Promise<Record<string, boolean>> {
  if (fields.length === 0) {
    return {};
  }

  const aggs = Object.fromEntries(
    fields.map((field) => [field, { filter: { exists: { field } } }])
  );

  const params = {
    apm: {
      events: [ProcessorEvent.metric],
    },
    track_total_hits: false,
    size: 0,
    query: {
      bool: {
        filter: [{ term: { [SERVICE_NAME]: serviceName } }],
      },
    },
    aggs,
  };

  const response = await apmEventClient.search('has_fields_probe', params);

  return Object.fromEntries(
    fields.map((field) => {
      const agg = response.aggregations?.[field] as { doc_count: number } | undefined;
      return [field, (agg?.doc_count ?? 0) > 0];
    })
  );
}
