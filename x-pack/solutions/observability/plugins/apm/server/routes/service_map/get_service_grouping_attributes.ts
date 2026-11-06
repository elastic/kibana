/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery, termsQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  KUBERNETES_NAMESPACE,
  SERVICE_NAME,
  SERVICE_NAMESPACE,
} from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import type { IEnvOptions } from './get_service_map';
import { extractEsQueryFilters } from './extract_es_query_filters';
import { recordByService } from './record_by_service';

/** Services per page. Each page holds two nested terms buckets per service. */
const PAGE_SIZE = 1000;
/** At most this many pages: 50,000 services. */
const MAX_PAGES = 50;

export interface ServiceGroupingAttributeValues {
  serviceNamespace?: string;
  kubernetesNamespace?: string;
}

/** Namespaces for each service, keyed by `service.name`. Not yet used to choose groups. */
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

/**
 * Reads each service's `service.namespace` and Kubernetes namespace from transaction
 * events. Metric rollups do not carry those fields. One value per field per service.
 * A service with neither is still listed. Services are read in pages so a large estate
 * does not pass Elasticsearch's bucket limit.
 */
export async function getServiceGroupingAttributes({
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
}: IEnvOptions & { maxNumberOfServices: number }): Promise<ServiceGroupingAttributes> {
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

  return recordByService(attributes);
}
