/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataPublicPluginStart, IKibanaSearchRequest } from '@kbn/data-plugin/public';
import { lastValueFrom } from 'rxjs';
import { rangeQuery } from '../../common/utils/queries';

const HARD_CODED_METRICS_INDICES = 'metrics-*,metricbeat-*,remote_cluster:metrics-*';
const HARD_CODED_APM_INDICES =
  'remote_cluster:apm-*,remote_cluster:metrics-apm*,apm-*,metrics-apm*';
export interface EntityServiceInfrastructure {
  containerIds: string[];
  hostNames: string[];
  podNames: string[];
}

export interface EntityServiceDetails {
  name: string;
  environment?: string;
  version: string;
  runtime: {
    name: string;
    version: number;
  };
  framework: string;
  agent: {
    name: string;
    version: number;
  };
}

export interface EntityService extends EntityServiceDetails {
  infrastructure: EntityServiceInfrastructure;
}

export interface GetServiceOptions {
  name: EntityService['name'];
  environment: EntityService['environment'];
  client: DataPublicPluginStart;
  start: number;
  end: number;
}

interface AggBucket {
  key: string;
}

async function getServiceDetails({
  name,
  environment,
  client,
  start,
  end,
}: GetServiceOptions): Promise<EntityServiceDetails> {
  const request: IKibanaSearchRequest = {
    id: 'get_service_infrastructure',
    params: {
      index: HARD_CODED_APM_INDICES,
      size: 1,
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
            {
              range: {
                '@timestamp': {
                  gte: start,
                  lte: end,
                  format: 'epoch_millis',
                },
              },
            },
          ],
        },
      },
    },
  };

  // TODO: use typed ES response
  const { rawResponse } = await lastValueFrom(client.search.search(request));
  const doc = rawResponse.hits?.hits[0]?._source ?? {};

  return doc.service;
}

async function getInfrastructureForService({
  name,
  environment,
  client,
  start,
  end,
}: GetServiceOptions): Promise<EntityServiceInfrastructure> {
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
            {
              range: {
                '@timestamp': {
                  gte: start,
                  lte: end,
                  format: 'epoch_millis',
                },
              },
            },
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
  // TODO: use typed ES response
  const { rawResponse } = await lastValueFrom(client.search.search(request));

  return {
    containerIds:
      rawResponse.aggregations?.containerIds?.buckets.map((bucket: AggBucket) => bucket.key) ?? [],
    hostNames:
      rawResponse.aggregations?.hostNames?.buckets.map((bucket: AggBucket) => bucket.key) ?? [],
    podNames:
      rawResponse.aggregations?.podNames?.buckets.map((bucket: AggBucket) => bucket.key) ?? [],
  };
}

/**
 * TODO: Add ability to specify which relationships you want to have returned
 */
export async function getService({
  name,
  environment,
  client,
  start,
  end,
}: GetServiceOptions): Promise<EntityService> {
  const [service, infrastructure] = await Promise.all([
    getServiceDetails({ name, environment, client, start, end }),
    getInfrastructureForService({ name, environment, client, start, end }),
  ]);

  if (infrastructure.containerIds.length > 0) {
    const containerHostNames = await getHostNames({
      client,
      index: HARD_CODED_METRICS_INDICES,
      containerIds: infrastructure.containerIds,
      start,
      end,
    });

    infrastructure.hostNames = containerHostNames.hostNames;
  }

  return {
    ...service,
    infrastructure,
  };
}

const getHostNames = async ({
  client,
  containerIds,
  index,
  start,
  end,
}: {
  client: DataPublicPluginStart;
  containerIds: string[];
  index: string;
  start: number;
  end: number;
}) => {
  const request: IKibanaSearchRequest = {
    id: 'get_hosts',
    params: {
      index,
      size: 0,
      query: {
        bool: {
          filter: [
            {
              terms: {
                'container.id': containerIds,
              },
            },
            ...rangeQuery(start, end),
          ],
        },
      },
      aggs: {
        hostNames: {
          terms: {
            field: 'host.name',
            size: 500,
          },
        },
      },
    },
  };

  const { rawResponse } = await lastValueFrom(client.search.search(request));

  return {
    hostNames:
      rawResponse.aggregations?.hostNames?.buckets.map(
        (bucket: AggBucket) => bucket.key as string
      ) ?? [],
  };
};
