/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import { uniq } from 'lodash';
import type { APMConfig } from '../../..';
import { parseDatemath } from '../../utils/time';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { getTraceSampleIds } from '../../../routes/service_map/get_trace_sample_ids';
import { fetchExitSpanSamplesFromTraceIds } from '../../../routes/service_map/fetch_exit_span_samples';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import type { TopologyDirection, ServiceTopologyResponse, ConnectionWithKey } from './types';
import { buildConnectionsFromSpans } from './build_connections_from_spans';
import { getConnectionMetrics, finalizeConnections } from './get_connection_metrics';
import { filterDownstreamConnections, filterUpstreamConnections } from './filter_connections';
import { getTraceIdsFromExitSpansTargetingDependency } from './get_trace_ids_from_exit_spans';

export type {
  TopologyDirection,
  ServiceTopologyNode,
  ExternalNode,
  ConnectionMetrics,
  ServiceTopologyConnection,
  ServiceTopologyResponse,
} from './types';

/**
 * Shared pipeline: fetch exit spans from trace IDs, build connections, filter by direction,
 * and enrich with service_destination metrics.
 */
async function buildTopologyFromTraceIds({
  apmEventClient,
  traceIds,
  serviceName,
  startMs,
  endMs,
  filterFn,
}: {
  apmEventClient: APMEventClient;
  traceIds: string[];
  serviceName: string;
  startMs: number;
  endMs: number;
  filterFn: (connections: ConnectionWithKey[], rootService: string) => ConnectionWithKey[];
}): Promise<ServiceTopologyResponse> {
  if (traceIds.length === 0) {
    return { tracesCount: 0, connections: [] };
  }

  const spans = await fetchExitSpanSamplesFromTraceIds({
    apmEventClient,
    traceIds,
    start: startMs,
    end: endMs,
  });

  const filtered = filterFn(buildConnectionsFromSpans(spans), serviceName);

  const serviceNames = uniq(filtered.map((c) => c._sourceName));
  const metricsMap = await getConnectionMetrics({
    apmEventClient,
    start: startMs,
    end: endMs,
    serviceNames,
  });

  return { tracesCount: traceIds.length, connections: finalizeConnections(filtered, metricsMap) };
}

async function getDownstreamTopology({
  apmEventClient,
  config,
  logger,
  serviceName,
  startMs,
  endMs,
}: {
  apmEventClient: APMEventClient;
  config: APMConfig;
  logger: Logger;
  serviceName: string;
  startMs: number;
  endMs: number;
}): Promise<ServiceTopologyResponse> {
  const { traceIds } = await getTraceSampleIds({
    config,
    apmEventClient,
    serviceName,
    environment: ENVIRONMENT_ALL.value,
    start: startMs,
    end: endMs,
  });

  logger.debug(`Found ${traceIds.length} traces for downstream topology`);

  return buildTopologyFromTraceIds({
    apmEventClient,
    traceIds,
    serviceName,
    startMs,
    endMs,
    filterFn: filterDownstreamConnections,
  });
}

async function getUpstreamTopology({
  apmEventClient,
  config,
  logger,
  serviceName,
  startMs,
  endMs,
}: {
  apmEventClient: APMEventClient;
  config: APMConfig;
  logger: Logger;
  serviceName: string;
  startMs: number;
  endMs: number;
}): Promise<ServiceTopologyResponse> {
  // Strategy: First try to find traces via the service's own transactions.
  // If the service has transactions (it's an instrumented service like "checkout-service"),
  // those traces will contain the full call chain including upstream callers.
  // This is reliable — no field matching needed.
  const { traceIds } = await getTraceSampleIds({
    config,
    apmEventClient,
    serviceName,
    environment: ENVIRONMENT_ALL.value,
    start: startMs,
    end: endMs,
  });

  if (traceIds.length > 0) {
    logger.debug(`Found ${traceIds.length} traces for upstream topology via service transactions`);

    return buildTopologyFromTraceIds({
      apmEventClient,
      traceIds,
      serviceName,
      startMs,
      endMs,
      filterFn: filterUpstreamConnections,
    });
  }

  // Fallback: the service has no transactions, so it's an external dependency (e.g., "postgres").
  // Find traces by exact match on span.destination.service.resource.
  logger.debug(
    `No transactions found for "${serviceName}", falling back to exit span search (external dependency)`
  );

  const depTraceIds = await getTraceIdsFromExitSpansTargetingDependency({
    apmEventClient,
    dependencyName: serviceName,
    start: startMs,
    end: endMs,
  });

  logger.debug(`Found ${depTraceIds.length} traces for upstream topology via exit spans`);

  return buildTopologyFromTraceIds({
    apmEventClient,
    traceIds: depTraceIds,
    serviceName,
    startMs,
    endMs,
    filterFn: filterUpstreamConnections,
  });
}

/**
 * Optimized path for direction === 'both': fetches trace samples and exit spans once,
 * then filters in both directions from the shared connection graph.
 *
 * This avoids duplicate ES queries — getTraceSampleIds and fetchExitSpanSamplesFromTraceIds
 * would otherwise execute identical queries for both downstream and upstream.
 */
async function getBothTopology({
  apmEventClient,
  config,
  logger,
  serviceName,
  startMs,
  endMs,
}: {
  apmEventClient: APMEventClient;
  config: APMConfig;
  logger: Logger;
  serviceName: string;
  startMs: number;
  endMs: number;
}): Promise<ServiceTopologyResponse> {
  const { traceIds } = await getTraceSampleIds({
    config,
    apmEventClient,
    serviceName,
    environment: ENVIRONMENT_ALL.value,
    start: startMs,
    end: endMs,
  });

  // External dependency (no transactions): downstream is empty, only upstream applies.
  // Fall back to finding traces via exit spans targeting this dependency.
  if (traceIds.length === 0) {
    logger.debug(
      `No transactions found for "${serviceName}", falling back to exit span search (external dependency)`
    );

    const depTraceIds = await getTraceIdsFromExitSpansTargetingDependency({
      apmEventClient,
      dependencyName: serviceName,
      start: startMs,
      end: endMs,
    });

    logger.debug(`Found ${depTraceIds.length} traces for upstream topology via exit spans`);

    return buildTopologyFromTraceIds({
      apmEventClient,
      traceIds: depTraceIds,
      serviceName,
      startMs,
      endMs,
      filterFn: filterUpstreamConnections,
    });
  }

  logger.debug(`Found ${traceIds.length} traces for both-direction topology`);

  // Fetch exit spans once, build connection graph once
  const spans = await fetchExitSpanSamplesFromTraceIds({
    apmEventClient,
    traceIds,
    start: startMs,
    end: endMs,
  });

  const allConnections = buildConnectionsFromSpans(spans);
  const downFiltered = filterDownstreamConnections(allConnections, serviceName);
  const upFiltered = filterUpstreamConnections(allConnections, serviceName);

  // Single metrics query with union of service names from both directions
  const serviceNames = uniq([
    ...downFiltered.map((c) => c._sourceName),
    ...upFiltered.map((c) => c._sourceName),
  ]);

  const metricsMap = await getConnectionMetrics({
    apmEventClient,
    start: startMs,
    end: endMs,
    serviceNames,
  });

  return {
    tracesCount: traceIds.length,
    connections: [
      ...finalizeConnections(downFiltered, metricsMap),
      ...finalizeConnections(upFiltered, metricsMap),
    ],
  };
}

export async function getApmServiceTopology({
  apmEventClient,
  config,
  logger,
  serviceName,
  direction = 'downstream',
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  config: APMConfig;
  logger: Logger;
  serviceName: string;
  direction?: TopologyDirection;
  start: string;
  end: string;
}): Promise<ServiceTopologyResponse> {
  const startMs = parseDatemath(start);
  const endMs = parseDatemath(end);

  const params = { apmEventClient, config, logger, serviceName, startMs, endMs };

  if (direction === 'downstream') {
    return getDownstreamTopology(params);
  }

  if (direction === 'upstream') {
    return getUpstreamTopology(params);
  }

  return getBothTopology(params);
}
