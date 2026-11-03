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

/** How far back the calls reach, ending when the map's own range ends. */
export const SERVICE_CALL_GRAPH_WINDOW_MS = 24 * 60 * 60 * 1000;
/** A gateway calls hundreds of destinations. Keep a bounded list per service. */
const MAX_DESTINATIONS_PER_SERVICE = 1000;
/** (service, destination) pairs per page, one bucket each. */
const PAGE_SIZE = 5000;
/** At most this many pages: 250,000 pairs. */
const MAX_PAGES = 50;
const ROLLUP_INTERVALS = [
  RollupInterval.SixtyMinutes,
  RollupInterval.TenMinutes,
  RollupInterval.OneMinute,
] as const;

export interface ServiceDestinationCall {
  destination: string;
  calls: number;
}

/** Destinations each service called, keyed by `service.name`. Not yet matched to a service. */
export type ServiceCallGraph = Record<string, ServiceDestinationCall[]>;

type ServiceCallGraphOptions = Pick<
  IEnvOptions,
  'apmEventClient' | 'environment' | 'end' | 'serviceGroupKuery'
>;

interface ServiceCallBucket {
  key: { service?: string | number | null; destination?: string | number | null };
  doc_count: number;
  calls?: { value?: number | null };
}

interface ServiceCallAggregate {
  buckets?: ServiceCallBucket[];
  after_key?: Record<string, string | number | null>;
}

/**
 * Reads each service's calls over the last day from the service destination metrics.
 */
export async function getServiceCallGraph({
  apmEventClient,
  environment,
  end,
  serviceGroupKuery,
}: ServiceCallGraphOptions): Promise<ServiceCallGraph> {
  // The coarsest rollup that has data. Clusters fed by the OTel connector only have 1 minute.
  for (const rollupInterval of ROLLUP_INTERVALS) {
    const graph = await readServiceCalls({
      apmEventClient,
      environment,
      end,
      serviceGroupKuery,
      rollupInterval,
    });
    if (Object.keys(graph).length > 0) {
      return graph;
    }
  }
  return {};
}

async function readServiceCalls({
  apmEventClient,
  environment,
  end,
  serviceGroupKuery,
  rollupInterval,
}: ServiceCallGraphOptions & { rollupInterval: RollupInterval }): Promise<ServiceCallGraph> {
  const graph: ServiceCallGraph = {};
  let after: Record<string, string | number | null> | undefined;

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
            ...rangeQuery(end - SERVICE_CALL_GRAPH_WINDOW_MS, end),
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
      const list = graph[serviceName] ?? [];
      if (list.length < MAX_DESTINATIONS_PER_SERVICE) {
        list.push({
          destination: String(destination),
          calls: bucket.calls?.value ?? bucket.doc_count,
        });
      }
      graph[serviceName] = list;
    }

    const buckets = calls?.buckets ?? [];
    if (buckets.length < PAGE_SIZE || !calls?.after_key) {
      break;
    }
    after = calls.after_key;
  }

  return graph;
}
