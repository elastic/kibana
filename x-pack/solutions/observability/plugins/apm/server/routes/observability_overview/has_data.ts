/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ObservabilityOverviewHasDataResponse } from '@kbn/apm-api-shared';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { hasApmData } from '../../lib/helpers/has_apm_data';

export async function getHasData({
  indices,
  apmEventClient,
}: {
  indices: APMIndices;
  apmEventClient: APMEventClient;
}): Promise<ObservabilityOverviewHasDataResponse> {
  try {
    const hasData = await hasApmData(apmEventClient, 'observability_overview_has_apm_data');
    return { hasData, indices };
  } catch (e) {
    return {
      hasData: false,
      indices,
    };
  }
}
