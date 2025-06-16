/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';

import type { ExitSpanDestination } from '../../../common/service_map/types';
import { getConnections, getLegacyNodeId } from '../../../common/service_map';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { fetchServicePathsFromTraceIds } from './fetch_service_paths_from_trace_ids';

export async function getServiceMapFromTraceIds({
  apmEventClient,
  traceIds,
  start,
  end,
  terminateAfter,
  serviceMapMaxAllowableBytes,
  numOfRequests,
  logger,
}: {
  apmEventClient: APMEventClient;
  traceIds: string[];
  start: number;
  end: number;
  terminateAfter: number;
  serviceMapMaxAllowableBytes: number;
  numOfRequests: number;
  logger: Logger;
}) {
  const serviceMapFromTraceIdsScriptResponse = await fetchServicePathsFromTraceIds({
    apmEventClient,
    traceIds,
    start,
    end,
    terminateAfter,
    serviceMapMaxAllowableBytes,
    numOfRequests,
  });

  logger.debug('Received scripted metric agg response');

  const serviceMapScriptedAggValue =
    serviceMapFromTraceIdsScriptResponse.aggregations?.service_map.value;

  return {
    connections: getConnections(serviceMapScriptedAggValue?.paths),
    discoveredServices: (serviceMapScriptedAggValue?.discoveredServices ?? []).map(
      (service) =>
        ({
          from: { ...service.from, id: getLegacyNodeId(service.from) },
          to: { ...service.to, id: getLegacyNodeId(service.to) },
        } as ExitSpanDestination)
    ),
  };
}
