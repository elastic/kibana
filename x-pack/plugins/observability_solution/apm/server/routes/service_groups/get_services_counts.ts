/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery, kqlQuery } from '@kbn/observability-plugin/server';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { SERVICE_NAME } from '../../../common/es_fields/apm';
import { SavedServiceGroup } from '../../../common/service_groups';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export async function getServicesCounts({
  apmEventClient,
  start,
  end,
  serviceGroups,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  serviceGroups: SavedServiceGroup[];
}) {
  if (!serviceGroups.length) {
    return {};
  }
  const serviceGroupsKueryMap = serviceGroups.reduce<Record<string, QueryDslQueryContainer>>(
    (acc, sg) => {
      acc[sg.id] = kqlQuery(sg.kuery)[0];
      return acc;
    },
    {}
  );

  const params = {
    apm: {
      // We're limiting the service count to only metrics documents. If a user
      // actively disables system/app metrics and a service only ingests error
      // events, that service will not be included in the service groups count.
      // This is an edge case that only effects the count preview label.
      events: [ProcessorEvent.metric],
    },
    body: {
      track_total_hits: 0,
      size: 0,
      query: {
        bool: {
          filter: rangeQuery(start, end),
        },
      },
      aggs: {
        service_groups: {
          filters: {
            filters: serviceGroupsKueryMap,
          },
          aggs: {
            services_count: {
              cardinality: {
                field: SERVICE_NAME,
              },
            },
          },
        },
      },
    },
  };
  const response = await apmEventClient.search('get_services_count', params);

  const buckets: Record<string, { services_count: { value: number } }> =
    response?.aggregations?.service_groups.buckets ?? {};

  return Object.keys(buckets).reduce<Record<string, number>>((acc, key) => {
    return {
      ...acc,
      [key]: buckets[key].services_count.value,
    };
  }, {});
}
