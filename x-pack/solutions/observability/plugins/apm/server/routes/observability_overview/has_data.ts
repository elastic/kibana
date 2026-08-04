/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ObservabilityOverviewHasDataResponse } from '@kbn/apm-api-shared';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import { ProcessorEvent } from '@kbn/apm-types-shared';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export async function getHasData({
  indices,
  apmEventClient,
}: {
  indices: APMIndices;
  apmEventClient: APMEventClient;
}): Promise<ObservabilityOverviewHasDataResponse> {
  try {
    const params = {
      apm: {
        events: [ProcessorEvent.transaction, ProcessorEvent.error, ProcessorEvent.metric],
      },
      terminate_after: 1,
      track_total_hits: 1,
      size: 0,
    };

    const response = await apmEventClient.search('observability_overview_has_apm_data', params);
    return {
      hasData: response.hits.total.value > 0,
      indices,
    };
  } catch (e) {
    return {
      hasData: false,
      indices,
    };
  }
}
