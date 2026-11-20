/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { ApmDocumentType } from '@kbn/apm-data-access-plugin/common';
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
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

export interface ServiceGroupingSavedGroup {
  id: string;
  name: string;
}

export interface ServiceGroupingAttributeValues {
  serviceNamespace?: string;
  kubernetesNamespace?: string;
  savedGroups?: ServiceGroupingSavedGroup[];
}

/** Labels for each service, keyed by `service.name`, to group services by attribute. */
export type ServiceGroupingAttributes = Record<string, ServiceGroupingAttributeValues>;

/**
 * A blank value, empty or only ASCII whitespace, as a Lucene regular expression, which matches the
 * whole value.
 */
const BLANK_VALUE_PATTERN = '[ \t\n\r]*';

interface SavedGroupServicesBucket {
  services?: { buckets?: Array<{ key?: string | number }> };
}

type GetServiceGroupingAttributesOptions = IEnvOptions & {
  /** The services the map draws, from `getMapServices`. Labels are read for these only. */
  services: readonly string[];
  maxNumberOfServices: number;
  /** Client-picked document type and rollup for the map when grouping is on. */
  source: ServiceStatsSource;
  /** Saved groups to match. Empty or omitted skips that lookup (also when already on a group map). */
  savedServiceGroups?: readonly SavedServiceGroup[];
};

/**
 * Reads the `service.namespace` and `kubernetes.namespace` of each service the map draws, and which
 * saved service groups match it. Only drawn services are listed. A drawn service the namespace
 * query does not find, and no saved group matches, has no labels.
 */
export async function getServiceGroupingAttributes(
  options: GetServiceGroupingAttributesOptions
): Promise<ServiceGroupingAttributes> {
  const [namespacesByService, savedGroupsByService] = await Promise.all([
    getNamespaceAttributes(options),
    getSavedGroupMembership(options),
  ]);

  const attributes = new Map<string, ServiceGroupingAttributeValues>(namespacesByService);
  // Membership is not scoped to the drawn services, so members that are not on the map are dropped.
  const drawn = new Set(options.services);
  for (const [serviceName, savedGroups] of savedGroupsByService) {
    if (!drawn.has(serviceName)) {
      continue;
    }
    attributes.set(serviceName, { ...attributes.get(serviceName), savedGroups });
  }

  return recordByService(attributes);
}

/**
 * Reads both namespaces of the given services from transaction events, as metric rollups do not
 * carry them. One value per field per service: its most frequent. A service with neither namespace
 * is still listed. A blank value, empty or only whitespace, counts as none: it is left out before
 * the most frequent value is picked, so like a missing value it never wins over a real one. Other
 * values are kept as stored, without trimming.
 *
 * The names stand in for the map's search bar and filters, which already chose them. Those can
 * target fields transaction events do not carry, so applying them again would drop services.
 *
 * The environment is applied, so a service gets the namespace it has in the selected environment.
 * With every environment selected, a service deployed
 * in several of them gets the namespace of the one where it has the most transactions.
 *
 * The map's own time range is kept rather than the call graph's fixed 24-hour window: every drawn
 * service was seen in it, and a namespace does not change with the window. A service with no
 * transaction events in the range, for example under tail-based sampling, is not found.
 */
async function getNamespaceAttributes({
  apmEventClient,
  environment,
  start,
  end,
  services,
}: GetServiceGroupingAttributesOptions): Promise<
  Map<string, Omit<ServiceGroupingAttributeValues, 'savedGroups'>>
> {
  const namespacesByService = new Map<
    string,
    Omit<ServiceGroupingAttributeValues, 'savedGroups'>
  >();
  if (services.length === 0) {
    return namespacesByService;
  }

  // Each service takes at most 3 buckets: its own, and one for each namespace it sets. Under
  // Elasticsearch's default `search.max_buckets` of 65,536, that supports about 21,800 services.
  const response = await apmEventClient.search('get_service_grouping_attributes_for_service_map', {
    apm: { events: [ProcessorEvent.transaction] },
    track_total_hits: false,
    size: 0,
    query: {
      bool: {
        filter: [
          ...rangeQuery(start, end),
          ...environmentQuery(environment),
          { terms: { [SERVICE_NAME]: [...services] } },
        ],
      },
    },
    aggs: {
      services: {
        terms: { field: SERVICE_NAME, size: services.length },
        aggs: {
          service_namespace: {
            terms: { field: SERVICE_NAMESPACE, size: 1, exclude: BLANK_VALUE_PATTERN },
          },
          kubernetes_namespace: {
            terms: { field: KUBERNETES_NAMESPACE, size: 1, exclude: BLANK_VALUE_PATTERN },
          },
        },
      },
    },
  });

  for (const bucket of response.aggregations?.services.buckets ?? []) {
    const serviceNamespace = namespaceValue(bucket.service_namespace.buckets[0]?.key);
    const kubernetesNamespace = namespaceValue(bucket.kubernetes_namespace.buckets[0]?.key);
    namespacesByService.set(String(bucket.key), {
      ...(serviceNamespace ? { serviceNamespace } : {}),
      ...(kubernetesNamespace ? { kubernetesNamespace } : {}),
    });
  }

  return namespacesByService;
}

/**
 * The namespace as stored, or `undefined` when there is none or it is blank. The query already
 * leaves out blank values, except those made of whitespace outside ASCII, which
 * `BLANK_VALUE_PATTERN` does not match.
 */
function namespaceValue(key: string | number | undefined): string | undefined {
  const value = key == null ? undefined : String(key);
  return value?.trim() ? value : undefined;
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
