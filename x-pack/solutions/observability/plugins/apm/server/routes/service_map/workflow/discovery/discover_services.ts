/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/**
 * 🔍 DISCOVERY
 *
 * Service discovery - finds all services that have data in the specified time window.
 * Used to determine which services need to be processed during aggregation.
 */
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { APMEventClient } from '../../../../lib/helpers/create_es_client/create_apm_event_client';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  AGENT_NAME,
  AT_TIMESTAMP,
} from '../../../../../common/es_fields/apm';
import { SERVICES_INDEX } from '../core/utils';
import { asMutableArray } from '../../../../../common/utils/as_mutable_array';

const BATCH_SIZE = 1000; // Bulk index in batches
const COMPOSITE_SIZE = 1000; // Composite aggregation page size

export interface DiscoverServicesParams {
  apmEventClient: APMEventClient;
  esClient: ElasticsearchClient;
  start: number;
  end: number;
  logger: Logger;
}

export interface DiscoverServicesResponse {
  count: number; // Number of services discovered and stored
  timestamp: number; // When discovery ran
  environments: string[]; // Unique environments found
}

/**
 * Discovers active services and stores them in ES index for processing.
 *
 * Uses composite aggregation to handle unlimited services (no 10k limit).
 *
 * Instead of returning 10,000+ service names (memory/payload issues),
 * this stores them in .apm-service-map-workflow-services index.
 *
 * The aggregate_by_service step then queries this index in pages,
 * allowing it to handle unlimited services without memory constraints.
 */
export async function discoverServices({
  apmEventClient,
  esClient,
  start,
  end,
  logger,
}: DiscoverServicesParams): Promise<DiscoverServicesResponse> {
  const timestamp = Date.now();

  logger.debug(
    `Discovering services from ${new Date(start).toISOString()} to ${new Date(end).toISOString()}`
  );

  // Delete old services from previous discovery
  await esClient.deleteByQuery({
    index: SERVICES_INDEX,
    refresh: true,
    query: { match_all: {} },
  });

  // Flatten service → environment combinations using composite aggregation (no 10k limit)
  const serviceEnvCombinations: Array<{
    service_name: string;
    service_environment: string;
    service_agent: string;
    doc_count: number;
  }> = [];

  let after: Record<string, string | number> | undefined;
  let pageCount = 0;
  let totalBuckets = 0;

  // Paginate through all services using composite aggregation
  do {
    if (pageCount > 0) {
      await new Promise(setImmediate);
    }
    pageCount++;

    logger.debug(`Fetching service discovery page ${pageCount}`);

    const response = await apmEventClient.search('discover_services', {
      apm: {
        events: [ProcessorEvent.span, ProcessorEvent.transaction],
      },
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [...rangeQuery(start, end)],
        },
      },
      aggs: {
        services: {
          composite: {
            size: COMPOSITE_SIZE,
            ...(after ? { after } : {}),
            sources: asMutableArray([
              { service_name: { terms: { field: SERVICE_NAME } } },
              {
                service_environment: {
                  terms: { field: SERVICE_ENVIRONMENT, missing_bucket: true },
                },
              },
            ] as const),
          },
          aggs: {
            latest: {
              top_metrics: {
                metrics: [{ field: AGENT_NAME }],
                sort: { [AT_TIMESTAMP]: 'desc' as const },
              },
            },
          },
        },
      },
    });

    const buckets = response.aggregations?.services.buckets ?? [];
    totalBuckets += buckets.length;

    buckets.forEach((bucket: any) => {
      const agentName = (bucket.latest.top[0]?.metrics[AGENT_NAME] as string) || '';
      serviceEnvCombinations.push({
        service_name: bucket.key.service_name as string,
        service_environment: bucket.key.service_environment as string,
        service_agent: agentName,
        doc_count: bucket.doc_count,
      });
    });

    after = response.aggregations?.services.after_key;
  } while (after);

  const serviceCount = serviceEnvCombinations.length;

  if (serviceCount === 0) {
    logger.info('No active services discovered');
    return { count: 0, timestamp, environments: [] };
  }

  logger.info(
    `Discovered ${serviceCount} service-environment combinations from ${pageCount} pages (${totalBuckets} total buckets)`
  );

  // Bulk index service-environment combinations in batches
  let indexed = 0;
  for (let i = 0; i < serviceEnvCombinations.length; i += BATCH_SIZE) {
    const batch = serviceEnvCombinations.slice(i, i + BATCH_SIZE);
    const operations = batch.flatMap((item) => {
      const docId = `${item.service_name}|${item.service_environment || '_default'}|${
        item.service_agent || '_unknown'
      }`;
      return [
        { index: { _index: SERVICES_INDEX, _id: docId } },
        {
          service_name: item.service_name,
          service_environment: item.service_environment,
          service_agent: item.service_agent,
          doc_count: item.doc_count,
          discovered_at: timestamp,
        },
      ];
    });

    const result = await esClient.bulk({
      operations,
      refresh: i + BATCH_SIZE >= serviceEnvCombinations.length, // Refresh on last batch
    });

    if (result.errors) {
      const errorCount = result.items.filter((item: any) => item.index?.error).length;
      logger.error(`Failed to index ${errorCount} services`);
    }

    indexed += batch.length;
    logger.debug(
      `Indexed ${indexed}/${serviceEnvCombinations.length} service-environment combinations`
    );
  }

  logger.info(
    `Discovered and stored ${serviceEnvCombinations.length} service-environment combinations in ${SERVICES_INDEX} (no 10k limit - used composite agg with ${pageCount} pages)`
  );

  // Extract unique environments for environment-scoped processing
  const uniqueEnvironments = [
    ...new Set(serviceEnvCombinations.map((item) => item.service_environment)),
  ].sort();

  return {
    count: serviceEnvCombinations.length,
    timestamp,
    environments: uniqueEnvironments,
  };
}
