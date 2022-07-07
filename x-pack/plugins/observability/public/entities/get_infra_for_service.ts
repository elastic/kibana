/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataPublicPluginStart, IKibanaSearchRequest } from '@kbn/data-plugin/public';
import { lastValueFrom } from 'rxjs';
import { rangeQuery } from '../../common/utils/queries';
import { getHostNamesForContainers } from './get_hosts_for_container';
import { AggBucket, EntityService, EntityServiceInfrastructure } from './types';

const HARD_CODED_METRICS_INDICES = 'metrics-*,metricbeat-*,remote_cluster:metrics-*';
const HARD_CODED_APM_INDICES =
  'remote_cluster:apm-*,remote_cluster:metrics-apm*,apm-*,metrics-apm*';

export interface GetServiceInfrastructureOptions {
  name: EntityService['name'];
  environment: EntityService['environment'];
  client: DataPublicPluginStart;
  start: number;
  end: number;
}

export async function getInfrastructureForService({
  name,
  environment,
  client,
  start,
  end,
}: GetServiceInfrastructureOptions): Promise<EntityServiceInfrastructure> {
  const request: IKibanaSearchRequest = {
    id: 'get_service_infrastructure',
    params: {
      index: HARD_CODED_APM_INDICES,
      size: 0,
      query: {
        bool: {
          filter: [
            {
              term: {
                'service.name': name,
              },
            },
            {
              term: {
                'service.environment': environment,
              },
            },
            ...rangeQuery(start, end),
            {
              terms: {
                'processor.event': ['metric'],
              },
            },
          ],
        },
      },
      aggs: {
        containerIds: {
          terms: {
            field: 'container.id',
            size: 500,
          },
        },
        hostNames: {
          terms: {
            field: 'host.hostname',
            size: 500,
          },
        },
        podNames: {
          terms: {
            field: 'kubernetes.pod.name',
            size: 500,
          },
        },
      },
    },
  };

  // console.log('getInfrastructureForService', request);

  // TODO: use typed ES response
  const { rawResponse } = await lastValueFrom(client.search.search(request));

  const results = {
    containerIds:
      rawResponse.aggregations?.containerIds?.buckets.map((bucket: AggBucket) => bucket.key) ?? [],
    hostNames:
      rawResponse.aggregations?.hostNames?.buckets.map((bucket: AggBucket) => bucket.key) ?? [],
    podNames:
      rawResponse.aggregations?.podNames?.buckets.map((bucket: AggBucket) => bucket.key) ?? [],
  };

  if (results.containerIds.length > 0) {
    const containerHostNames = await getHostNamesForContainers({
      client,
      index: HARD_CODED_METRICS_INDICES,
      containerIds: results.containerIds,
      start,
      end,
    });

    results.hostNames = containerHostNames;
  }

  return results;
}
