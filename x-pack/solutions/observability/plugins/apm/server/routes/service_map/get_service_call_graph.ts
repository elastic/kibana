/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { ApmDocumentType, RollupInterval } from '@kbn/apm-data-access-plugin/common';
import {
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
} from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import type { IEnvOptions } from './get_service_map';
import { recordByService } from './record_by_service';

/** How far back the calls reach, ending when the map's own range ends. */
export const SERVICE_CALL_GRAPH_WINDOW_MS = 24 * 60 * 60 * 1000;
/** A 60-minute rollup can omit calls from the last hour. */
const SIXTY_MINUTE_ROLLUP_LAG_MS = 60 * 60 * 1000;
/** A 10-minute rollup can omit calls from the last 10 minutes. */
const TEN_MINUTE_ROLLUP_LAG_MS = 10 * 60 * 1000;

/** A gateway calls hundreds of destinations. Keep a bounded list per service. */
const MAX_DESTINATIONS_PER_SERVICE = 1000;
/** (service, destination) pairs per page, one bucket each. */
const PAGE_SIZE = 5000;
/** At most this many pages: 250,000 pairs. */
const MAX_PAGES = 50;

export interface ServiceDestinationCall {
  destination: string;
  calls: number;
}

/** Destinations each service called, keyed by `service.name`. Not yet matched to a service. */
export type ServiceCallGraph = Record<string, ServiceDestinationCall[]>;

type ServiceCallGraphOptions = Pick<
  IEnvOptions,
  'apmEventClient' | 'environment' | 'end' | 'logger' | 'serviceGroupKuery'
>;

interface ServiceCallBucket {
  key: { service?: string | number | null; destination?: string | number | null };
  calls?: { value?: number | null };
}

interface ServiceCallAggregate {
  buckets?: ServiceCallBucket[];
  after_key?: Record<string, string | number | null>;
}

interface DestinationMetricsAvailability {
  sixtyMinutes: boolean;
  tenMinutes: boolean;
  oneMinute: boolean;
}

const AVAILABILITY_CHECKS = [
  { key: 'sixtyMinutes', rollupInterval: RollupInterval.SixtyMinutes },
  { key: 'tenMinutes', rollupInterval: RollupInterval.TenMinutes },
  { key: 'oneMinute', rollupInterval: RollupInterval.OneMinute },
] as const satisfies ReadonlyArray<{
  key: keyof DestinationMetricsAvailability;
  rollupInterval: RollupInterval;
}>;

/**
 * Reads each service's calls over the last day.
 * One check picks the coarsest rollup that has data, then that rollup and its
 * recent calls are read together. Pairs already counted keep that count.
 * A failed check does not fall through to another rollup.
 */
export async function getServiceCallGraph(
  options: ServiceCallGraphOptions
): Promise<ServiceCallGraph> {
  const rollupInterval = chooseRollupInterval(await getDestinationMetricsAvailability(options));
  if (!rollupInterval) {
    return {};
  }

  return mergeServiceCalls(
    await Promise.all([
      readServiceCalls({ ...options, rollupInterval }),
      ...readCallsNotYetInRollup(options, rollupInterval),
    ]),
    options.logger
  );
}

/**
 * Exists-check for each rollup. `terminate_after` stops at the first matching document,
 * so this does not scan the day the composite aggregation reads next.
 */
async function getDestinationMetricsAvailability({
  apmEventClient,
  environment,
  end,
  serviceGroupKuery,
}: ServiceCallGraphOptions): Promise<DestinationMetricsAvailability> {
  const filter = [
    ...rangeQuery(end - SERVICE_CALL_GRAPH_WINDOW_MS, end),
    ...environmentQuery(environment),
    ...kqlQuery(serviceGroupKuery),
  ];

  const { responses } = await apmEventClient.msearch(
    'get_service_call_graph_availability',
    ...AVAILABILITY_CHECKS.map(({ rollupInterval }) => ({
      apm: {
        sources: [{ documentType: ApmDocumentType.ServiceDestinationMetric, rollupInterval }],
      },
      track_total_hits: 1,
      size: 0,
      terminate_after: 1,
      query: {
        bool: {
          filter,
        },
      },
    }))
  );

  const availability: DestinationMetricsAvailability = {
    sixtyMinutes: false,
    tenMinutes: false,
    oneMinute: false,
  };
  for (const [index, { key }] of AVAILABILITY_CHECKS.entries()) {
    availability[key] = availabilityResponseHasDocs(responses[index], key);
  }
  return availability;
}

/** A failed check is a failed query. Treating it as empty would read the wrong rollup. */
function availabilityResponseHasDocs(response: unknown, key: string): boolean {
  const total = (response as { hits?: { total?: number | { value?: number } } } | undefined)?.hits
    ?.total;
  const count = typeof total === 'number' ? total : total?.value;
  if (count == null || (typeof response === 'object' && response !== null && 'error' in response)) {
    throw new Error(`Unable to check ${key} service destination metrics`);
  }
  return count > 0;
}

/** The coarsest rollup that has data for the day. */
function chooseRollupInterval({
  sixtyMinutes,
  tenMinutes,
  oneMinute,
}: DestinationMetricsAvailability): RollupInterval | undefined {
  if (sixtyMinutes) {
    return RollupInterval.SixtyMinutes;
  }
  if (tenMinutes) {
    return RollupInterval.TenMinutes;
  }
  // Nothing coarser exists, so the 1-minute metrics are the whole day: up to 50 pages.
  return oneMinute ? RollupInterval.OneMinute : undefined;
}

/** Reads calls newer than the chosen rollup. The 1-minute rollup already covers the day. */
function readCallsNotYetInRollup(
  options: ServiceCallGraphOptions,
  rollupInterval: RollupInterval
): Array<Promise<ServiceCallGraph>> {
  if (rollupInterval === RollupInterval.SixtyMinutes) {
    return [
      readServiceCalls({
        ...options,
        rollupInterval: RollupInterval.TenMinutes,
        sinceMs: SIXTY_MINUTE_ROLLUP_LAG_MS,
      }),
      readServiceCalls({
        ...options,
        rollupInterval: RollupInterval.OneMinute,
        sinceMs: TEN_MINUTE_ROLLUP_LAG_MS,
      }),
    ];
  }

  if (rollupInterval === RollupInterval.TenMinutes) {
    return [
      readServiceCalls({
        ...options,
        rollupInterval: RollupInterval.OneMinute,
        sinceMs: TEN_MINUTE_ROLLUP_LAG_MS,
      }),
    ];
  }

  return [];
}

/** Finer rollups only contribute pairs the coarser ones did not already count. */
function mergeServiceCalls(
  graphs: readonly ServiceCallGraph[],
  logger: ServiceCallGraphOptions['logger']
): ServiceCallGraph {
  const merged = new Map<string, Map<string, number>>();
  const truncatedServices = new Set<string>();

  for (const graph of graphs) {
    for (const [service, destinations] of Object.entries(graph)) {
      const byDestination = merged.get(service) ?? new Map<string, number>();
      for (const { destination, calls } of destinations) {
        if (byDestination.has(destination)) {
          continue;
        }
        if (byDestination.size >= MAX_DESTINATIONS_PER_SERVICE) {
          truncatedServices.add(service);
          continue;
        }
        byDestination.set(destination, calls);
      }
      if (byDestination.size > 0) {
        merged.set(service, byDestination);
      }
    }
  }

  for (const service of truncatedServices) {
    logger.debug(
      `Service call graph kept ${MAX_DESTINATIONS_PER_SERVICE} destinations for ${service}.`
    );
  }

  return recordByService(
    [...merged].map(([service, destinations]) => [
      service,
      [...destinations].map(([destination, calls]) => ({ destination, calls })),
    ])
  );
}

async function readServiceCalls({
  apmEventClient,
  environment,
  end,
  logger,
  serviceGroupKuery,
  rollupInterval,
  sinceMs = SERVICE_CALL_GRAPH_WINDOW_MS,
}: ServiceCallGraphOptions & {
  rollupInterval: RollupInterval;
  sinceMs?: number;
}): Promise<ServiceCallGraph> {
  const graph = new Map<string, ServiceDestinationCall[]>();
  const truncatedServices = new Set<string>();
  let after: Record<string, string | number | null> | undefined;
  let stoppedAtPageLimit = false;

  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await apmEventClient.search('get_service_call_graph_for_service_map', {
      apm: {
        sources: [{ documentType: ApmDocumentType.ServiceDestinationMetric, rollupInterval }],
      },
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            ...rangeQuery(end - sinceMs, end),
            ...environmentQuery(environment),
            ...kqlQuery(serviceGroupKuery),
          ],
        },
      },
      aggs: {
        calls: {
          composite: {
            size: PAGE_SIZE,
            sources: [
              { service: { terms: { field: SERVICE_NAME } } },
              { destination: { terms: { field: SPAN_DESTINATION_SERVICE_RESOURCE } } },
            ],
            ...(after ? { after } : {}),
          },
          aggs: {
            calls: { sum: { field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT } },
          },
        },
      },
    });

    const calls = (response.aggregations as { calls?: ServiceCallAggregate } | undefined)?.calls;
    for (const bucket of calls?.buckets ?? []) {
      const service = bucket.key.service;
      const destination = bucket.key.destination;
      if (service == null || destination == null) {
        continue;
      }
      const serviceName = String(service);
      const list = graph.get(serviceName) ?? [];
      if (list.length >= MAX_DESTINATIONS_PER_SERVICE) {
        truncatedServices.add(serviceName);
      } else {
        list.push({
          destination: String(destination),
          calls: bucket.calls?.value ?? 0,
        });
        graph.set(serviceName, list);
      }
    }

    const buckets = calls?.buckets ?? [];
    if (buckets.length < PAGE_SIZE || !calls?.after_key) {
      break;
    }
    if (page === MAX_PAGES - 1) {
      stoppedAtPageLimit = true;
      break;
    }
    after = calls.after_key;
  }

  if (stoppedAtPageLimit) {
    logger.debug(`Service call graph stopped after ${MAX_PAGES} pages.`);
  }
  for (const service of truncatedServices) {
    logger.debug(
      `Service call graph kept ${MAX_DESTINATIONS_PER_SERVICE} destinations for ${service}.`
    );
  }

  return recordByService(graph);
}
