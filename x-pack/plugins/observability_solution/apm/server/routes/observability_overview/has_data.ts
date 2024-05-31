/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { APMIndices } from '@kbn/apm-data-access-plugin/server';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export interface HasDataResponse {
  hasData: boolean;
  indices: Readonly<{
    error: string;
    onboarding: string;
    span: string;
    transaction: string;
    metric: string;
  }>;
}

export async function getHasData({
  indices,
  apmEventClient,
}: {
  indices: APMIndices;
  apmEventClient: APMEventClient;
}): Promise<HasDataResponse> {
  try {
    const params = {
      apm: {
        events: [ProcessorEvent.transaction, ProcessorEvent.error, ProcessorEvent.metric],
      },
      terminate_after: 1,
      body: {
        track_total_hits: 1,
        size: 0,
      },
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
