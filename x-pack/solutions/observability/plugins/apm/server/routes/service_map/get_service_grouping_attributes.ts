/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { ApmDocumentType } from '@kbn/apm-data-access-plugin/common';
import { kqlQuery, rangeQuery, termsQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { SavedServiceGroup } from '../../../common/service_groups';
import {
  KUBERNETES_NAMESPACE,
  SERVICE_NAME,
  SERVICE_NAMESPACE,
} from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import type { IEnvOptions } from './get_service_map';
import type { ServiceStatsSource } from './get_enhanced_service_stats';
import { extractEsQueryFilters } from './extract_es_query_filters';
import { recordByService } from './record_by_service';

/** Services per page. Each page holds two nested terms buckets per service. */
const PAGE_SIZE = 1000;
/** At most this many pages: 50,000 services. */
const MAX_PAGES = 50;

export interface ServiceGroupingSavedGroup {
  id: string;
  name: string;
}

export interface ServiceGroupingAttributeValues {
  serviceNamespace?: string;
  kubernetesNamespace?: string;
  savedGroups?: ServiceGroupingSavedGroup[];
}

/** Labels for each service, keyed by `service.name`. Not yet used to choose groups. */
export type ServiceGroupingAttributes = Record<string, ServiceGroupingAttributeValues>;

interface ServiceAttributeBucket {
  key: { service?: string | number | null };
  service_namespace?: { buckets?: Array<{ key?: string | number }> };
  kubernetes_namespace?: { buckets?: Array<{ key?: string | number }> };
}

interface ServiceAttributeAggregate {
  buckets?: ServiceAttributeBucket[];
  after_key?: Record<string, string | number | null>;
}

interface SavedGroupServicesBucket {
  services?: { buckets?: Array<{ key?: string | number }> };
}

type GetServiceGroupingAttributesOptions = IEnvOptions & {
  maxNumberOfServices: number;
  /** Client-picked document type and rollup for the map when grouping is on. */
  source: ServiceStatsSource;
  /** Saved groups to match. Empty or omitted skips that lookup (also when already on a group map). */
  savedServiceGroups?: SavedServiceGroup[];
};

/**
 * Reads each service's `service.namespace` and Kubernetes namespace from transaction
 * events, and which saved service groups match it. Metric rollups do not carry the
 * namespace fields. One value per namespace field per service. A service with neither
 * namespace is still listed. Services are read in pages so a large estate does not pass
 * Elasticsearch's bucket limit. Saved groups use one filters aggregation on the
 * client-picked map data source.
 */
export async function getServiceGroupingAttributes(
  options: GetServiceGroupingAttributesOptions
): Promise<ServiceGroupingAttributes> {
  const [namespaces, savedGroupsByService] = await Promise.all([
    getNamespaceAttributes(options),
    getSavedGroupMembership(options),
  ]);

  // Merge saved groups onto namespace rows. New services from membership only are
  // added while under maxNumberOfServices so the record stays within the map cap.
  for (const [serviceName, savedGroups] of savedGroupsByService) {
    const current = namespaces.get(serviceName);
    if (current) {
      namespaces.set(serviceName, { ...current, savedGroups });
      continue;
    }
    if (namespaces.size >= options.maxNumberOfServices) {
      continue;
    }
    namespaces.set(serviceName, { savedGroups });
  }

  return recordByService(namespaces);
}

async function getNamespaceAttributes({
  environment,
  apmEventClient,
  start,
  end,
  maxNumberOfServices,
  serviceGroupKuery,
  serviceName,
  kuery,
  esQuery,
  logger,
}: GetServiceGroupingAttributesOptions): Promise<Map<string, ServiceGroupingAttributeValues>> {
  const { filter: esQueryFilters, mustNot: esQueryMustNot } = extractEsQueryFilters(esQuery);
  const attributes = new Map<string, ServiceGroupingAttributeValues>();
  let after: Record<string, string | number | null> | undefined;
  let stoppedAtPageLimit = false;

  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await apmEventClient.search(
      'get_service_grouping_attributes_for_service_map',
      {
        apm: { events: [ProcessorEvent.transaction] },
        track_total_hits: false,
        size: 0,
        query: {
          bool: {
            filter: [
              ...rangeQuery(start, end),
              ...environmentQuery(environment),
              ...termsQuery(SERVICE_NAME, serviceName),
              ...kqlQuery(serviceGroupKuery),
              ...kqlQuery(kuery),
              ...esQueryFilters,
            ],
            ...(esQueryMustNot.length > 0 ? { must_not: esQueryMustNot } : {}),
          },
        },
        aggs: {
          services: {
            composite: {
              size: PAGE_SIZE,
              sources: [{ service: { terms: { field: SERVICE_NAME } } }],
              ...(after ? { after } : {}),
            },
            aggs: {
              service_namespace: { terms: { field: SERVICE_NAMESPACE, size: 1 } },
              kubernetes_namespace: { terms: { field: KUBERNETES_NAMESPACE, size: 1 } },
            },
          },
        },
      }
    );

    const services = (response.aggregations as { services?: ServiceAttributeAggregate } | undefined)
      ?.services;

    for (const bucket of services?.buckets ?? []) {
      if (attributes.size >= maxNumberOfServices) {
        break;
      }
      const name = bucket.key.service;
      if (name == null) {
        continue;
      }
      const serviceNamespace = bucket.service_namespace?.buckets?.[0]?.key;
      const kubernetesNamespace = bucket.kubernetes_namespace?.buckets?.[0]?.key;
      attributes.set(String(name), {
        ...(serviceNamespace != null ? { serviceNamespace: String(serviceNamespace) } : {}),
        ...(kubernetesNamespace != null
          ? { kubernetesNamespace: String(kubernetesNamespace) }
          : {}),
      });
    }

    if (attributes.size >= maxNumberOfServices) {
      break;
    }

    const buckets = services?.buckets ?? [];
    if (buckets.length < PAGE_SIZE || !services?.after_key) {
      break;
    }
    if (page === MAX_PAGES - 1) {
      stoppedAtPageLimit = true;
      break;
    }
    after = services.after_key;
  }

  if (stoppedAtPageLimit) {
    logger.debug(`Service grouping attributes stopped after ${MAX_PAGES} pages.`);
  }

  return attributes;
}

/**
 * Matches services to saved groups with one filters aggregation (filter key = group id).
 * Skipped when the caller passes no groups, or when the map is already a group map.
 * Uses the client-picked map data source.
 */
async function getSavedGroupMembership({
  environment,
  apmEventClient,
  start,
  end,
  maxNumberOfServices,
  serviceGroupKuery,
  source,
  kuery,
  esQuery,
  logger,
  savedServiceGroups = [],
}: GetServiceGroupingAttributesOptions): Promise<Map<string, ServiceGroupingSavedGroup[]>> {
  const membership = new Map<string, ServiceGroupingSavedGroup[]>();
  if (savedServiceGroups.length === 0 || serviceGroupKuery) {
    return membership;
  }

  try {
    const groupById = new Map<string, SavedServiceGroup>();
    const serviceGroupsKueryMap: Record<string, QueryDslQueryContainer> = {};
    for (const group of savedServiceGroups) {
      try {
        const filter = kqlQuery(group.kuery)[0];
        if (!filter) {
          continue;
        }
        serviceGroupsKueryMap[group.id] = filter;
        groupById.set(group.id, group);
      } catch (error) {
        logger.debug(`Skipping saved service group "${group.id}" with invalid kuery.`, { error });
      }
    }
    if (Object.keys(serviceGroupsKueryMap).length === 0) {
      return membership;
    }

    const { filter: esQueryFilters, mustNot: esQueryMustNot } = extractEsQueryFilters(esQuery);
    const { documentType, rollupInterval } = source;

    const searchMembership = async (
      operationName: string,
      searchDocumentType: ServiceStatsSource['documentType']
    ) => {
      const response = await apmEventClient.search(operationName, {
        apm: getApmSource(searchDocumentType, rollupInterval),
        track_total_hits: false,
        size: 0,
        query: {
          bool: {
            filter: [
              ...rangeQuery(start, end),
              ...environmentQuery(environment),
              ...kqlQuery(kuery),
              ...esQueryFilters,
            ],
            ...(esQueryMustNot.length > 0 ? { must_not: esQueryMustNot } : {}),
          },
        },
        aggs: {
          service_groups: {
            filters: {
              filters: serviceGroupsKueryMap,
            },
            aggs: {
              services: {
                terms: {
                  field: SERVICE_NAME,
                  size: maxNumberOfServices,
                },
              },
            },
          },
        },
      });

      return collectMembership(
        (
          response.aggregations as
            | { service_groups?: { buckets?: Record<string, SavedGroupServicesBucket> } }
            | undefined
        )?.service_groups?.buckets,
        groupById
      );
    };

    let result = await searchMembership(
      'get_service_grouping_saved_groups_for_service_map',
      documentType
    );

    // `ServiceTransactionMetric` may not carry fields used in the map filters; retry
    // against `TransactionMetric` at the same interval.
    const hasKueryFilter = Boolean(kuery && kuery.trim() !== '');
    const hasEsQueryFilter = esQueryFilters.length > 0;
    const shouldRetry =
      documentType === ApmDocumentType.ServiceTransactionMetric &&
      result.size === 0 &&
      (hasKueryFilter || hasEsQueryFilter);

    if (shouldRetry) {
      result = await searchMembership(
        'get_service_grouping_saved_groups_for_service_map_fallback',
        ApmDocumentType.TransactionMetric
      );
    }

    return result;
  } catch (error) {
    // Keep namespaces usable when membership fails (e.g. filters agg hits max_buckets).
    logger.debug(`Unable to retrieve saved group membership for service maps.`, { error });
    return new Map();
  }
}

function getApmSource(
  documentType: ServiceStatsSource['documentType'],
  rollupInterval: ServiceStatsSource['rollupInterval']
):
  | { events: [ProcessorEvent.transaction] }
  | {
      sources: Array<{
        documentType: ServiceStatsSource['documentType'];
        rollupInterval: typeof rollupInterval;
      }>;
    } {
  if (documentType === ApmDocumentType.TransactionEvent) {
    return { events: [ProcessorEvent.transaction] };
  }
  return { sources: [{ documentType, rollupInterval }] };
}

function collectMembership(
  buckets: Record<string, SavedGroupServicesBucket> | undefined,
  groupById: Map<string, SavedServiceGroup>
): Map<string, ServiceGroupingSavedGroup[]> {
  const membership = new Map<string, ServiceGroupingSavedGroup[]>();
  if (!buckets) {
    return membership;
  }

  for (const [groupId, bucket] of Object.entries(buckets)) {
    const group = groupById.get(groupId);
    if (!group) {
      continue;
    }
    const match = { id: group.id, name: group.groupName };
    for (const serviceBucket of bucket.services?.buckets ?? []) {
      if (serviceBucket.key == null) {
        continue;
      }
      const serviceName = String(serviceBucket.key);
      const current = membership.get(serviceName) ?? [];
      current.push(match);
      membership.set(serviceName, current);
    }
  }

  return membership;
}
