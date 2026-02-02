/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/**
 * 📊 AGGREGATION
 *
 * Service-level batching and aggregation orchestration.
 * Processes services in batches to avoid memory/performance issues.
 * Calls aggregation.ts functions for each batch and collects results.
 */
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import pLimit from 'p-limit';
import type { APMEventClient } from '../../../../lib/helpers/create_es_client/create_apm_event_client';
import { aggregateExitSpanEdges, aggregateSpanLinkEdges } from './aggregation';
import { indexEdges } from '../storage/indexing';
import { SERVICES_INDEX } from '../core/utils';

const SERVICES_PER_PAGE = 100;

export interface ServiceMetadata {
  service_name: string;
  service_environment: string;
  service_agent: string;
}

export interface AggregateByServiceParams {
  apmEventClient: APMEventClient;
  esClient: ElasticsearchClient;
  start: number;
  end: number;
  edgeType: 'exit_span' | 'span_link';
  servicesPerBatch: number;
  maxConcurrency: number;
  environment?: string; // Optional: filter to specific environment
  logger: Logger;
}

export interface ServiceBatchResult {
  services: ServiceMetadata[];
  edges: number;
  duration: number;
  success: boolean;
  error?: string;
  created: number;
  updated: number;
  skipped: number;
}

export interface AggregateByServiceResponse {
  totalEdges: number;
  totalCreated: number;
  totalUpdated: number;
  totalSkipped: number;
  serviceResults: ServiceBatchResult[];
  failedServices: ServiceMetadata[];
  batchesProcessed: number;
  batchesSucceeded: number;
  batchesFailed: number;
  environment?: string; // Environment that was processed (if filtered)
}

/**
 * Aggregate service map edges by service batch with parallel processing.
 *
 * This queries services from the .apm-service-map-workflow-services index (populated by discover_services step),
 * splits them into batches, and processes them in parallel, providing:
 * - Better parallelism (multiple smaller queries vs 1 large query)
 * - Failure isolation (one service batch failing doesn't kill the whole run)
 * - Observable (see which services are slow)
 * - Retryable (can retry failed services)
 * - Scalable (handles 10,000+ services via pagination)
 */
export async function aggregateByService({
  apmEventClient,
  esClient,
  start,
  end,
  edgeType,
  servicesPerBatch,
  maxConcurrency,
  environment,
  logger,
}: AggregateByServiceParams): Promise<AggregateByServiceResponse> {
  // Paginate through services from ES index
  let searchAfter: any[] | undefined;
  let hasMorePages = true;
  let totalServices = 0;
  const allServices: ServiceMetadata[] = [];

  logger.info(
    `Querying services from index${environment ? ` (environment: ${environment})` : ''}...`
  );

  while (hasMorePages) {
    const response = await esClient.search({
      index: SERVICES_INDEX,
      size: SERVICES_PER_PAGE,
      sort: [{ discovered_at: 'desc' }, { service_name: 'asc' }],
      query: {
        bool: {
          must: [
            { exists: { field: 'service_name' } }, // Query only service documents (not edges)
            ...(environment && environment !== ''
              ? [{ term: { service_environment: environment } }]
              : []),
          ],
          must_not: [
            ...(environment === undefined || environment === null || environment === ''
              ? [{ exists: { field: 'service_environment' } }]
              : []),
          ],
        },
      },
      ...(searchAfter ? { search_after: searchAfter } : {}),
    });

    const hits = response.hits.hits;
    if (hits.length === 0) {
      hasMorePages = false;
      break;
    }

    // Extract service metadata
    hits.forEach((hit: any) => {
      const source = hit._source;
      allServices.push({
        service_name: source.service_name,
        service_environment: source.service_environment || '',
        service_agent: source.service_agent || '',
      });
    });

    totalServices += hits.length;

    // Get search_after for next page
    if (hits.length === SERVICES_PER_PAGE) {
      searchAfter = hits[hits.length - 1].sort;
    } else {
      hasMorePages = false;
    }
  }

  logger.info(`Found ${totalServices} services from index`);

  if (totalServices === 0) {
    logger.warn('No services found in index. Run discover-services step first.');
    return {
      totalEdges: 0,
      totalCreated: 0,
      totalUpdated: 0,
      totalSkipped: 0,
      serviceResults: [],
      failedServices: [],
      batchesProcessed: 0,
      batchesSucceeded: 0,
      batchesFailed: 0,
    };
  }

  // Split services into batches
  const batches: ServiceMetadata[][] = [];
  for (let i = 0; i < allServices.length; i += servicesPerBatch) {
    batches.push(allServices.slice(i, i + servicesPerBatch));
  }

  logger.info(
    `Processing ${totalServices} services in ${batches.length} batches (${servicesPerBatch} services per batch, max ${maxConcurrency} concurrent)`
  );

  const limit = pLimit(maxConcurrency);
  const results: ServiceBatchResult[] = [];

  // Process batches in parallel with concurrency limit
  await Promise.all(
    batches.map((serviceBatch) =>
      limit(async () => {
        const startTime = Date.now();
        const batchKey = serviceBatch.map((s) => s.service_name).join(',');

        try {
          logger.debug(
            `Processing batch of ${serviceBatch.length} services: ${serviceBatch
              .slice(0, 3)
              .map((s) => s.service_name)
              .join(', ')}${serviceBatch.length > 3 ? '...' : ''}`
          );

          // Extract service names for aggregation query filter
          const serviceNames = serviceBatch.map((s) => s.service_name);

          // Aggregate edges for this service batch
          const edges =
            edgeType === 'exit_span'
              ? await aggregateExitSpanEdges({
                  apmEventClient,
                  start,
                  end,
                  serviceFilter: serviceNames, // Filter by service names
                  environment, // Filter by environment if provided
                  logger,
                })
              : await aggregateSpanLinkEdges({
                  apmEventClient,
                  start,
                  end,
                  serviceFilter: serviceNames, // Filter by service names
                  environment, // Filter by environment if provided
                  logger,
                });

          if (edges.length === 0) {
            logger.debug(`No edges found for batch: ${batchKey}`);
            results.push({
              services: serviceBatch,
              edges: 0,
              duration: Date.now() - startTime,
              success: true,
              created: 0,
              updated: 0,
              skipped: 0,
            });
            return;
          }

          // Index edges immediately
          const indexResult = await indexEdges({
            esClient,
            edges,
            logger,
            existingEdgesMap: new Map(), // Treat all as new for service-scoped workflow
          });

          const duration = Date.now() - startTime;
          logger.info(
            `Batch ${batchKey}: ${edges.length} edges (${indexResult.created} created, ${indexResult.updated} updated, ${indexResult.skipped} skipped) in ${duration}ms`
          );

          results.push({
            services: serviceBatch,
            edges: edges.length,
            duration,
            success: true,
            created: indexResult.created,
            updated: indexResult.updated,
            skipped: indexResult.skipped,
          });
        } catch (error) {
          const duration = Date.now() - startTime;
          logger.error(
            `Failed to process batch ${batchKey}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );

          results.push({
            services: serviceBatch,
            edges: 0,
            duration,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            created: 0,
            updated: 0,
            skipped: 0,
          });
        }
      })
    )
  );

  // Aggregate results
  const totalEdges = results.reduce((sum, r) => sum + r.edges, 0);
  const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
  const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
  const failedServices = results.filter((r) => !r.success).flatMap((r) => r.services);
  const batchesSucceeded = results.filter((r) => r.success).length;
  const batchesFailed = results.filter((r) => !r.success).length;

  logger.info(
    `Service-scoped aggregation complete: ${totalEdges} total edges, ${batchesSucceeded}/${batches.length} batches succeeded`
  );

  if (failedServices.length > 0) {
    logger.warn(
      `${failedServices.length} services failed: ${failedServices
        .map((s) => s.service_name)
        .join(', ')}`
    );
  }

  return {
    totalEdges,
    totalCreated,
    totalUpdated,
    totalSkipped,
    serviceResults: results,
    failedServices,
    batchesProcessed: batches.length,
    batchesSucceeded,
    batchesFailed,
    environment,
  };
}
