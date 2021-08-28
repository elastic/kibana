/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ESFilter } from '../../../../../../src/core/types/elasticsearch';
import {
  kqlQuery,
  rangeQuery,
} from '../../../../observability/server/utils/queries';
import {
  CONTAINER_ID,
  HOSTNAME,
  POD_NAME,
  SERVICE_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { environmentQuery } from '../../../common/utils/environment_query';
import type { Setup, SetupTimeRange } from '../helpers/setup_request';

export const getServiceInfrastructure = async ({
  kuery,
  serviceName,
  environment,
  setup,
}: {
  kuery: string;
  serviceName: string;
  environment: string;
  setup: Setup & SetupTimeRange;
}) => {
  const { apmEventClient, start, end } = setup;

  const filter: ESFilter[] = [
    { term: { [SERVICE_NAME]: serviceName } },
    ...rangeQuery(start, end),
    ...environmentQuery(environment),
    ...kqlQuery(kuery),
  ];

  const response = await apmEventClient.search('get_service_infrastructure', {
    apm: {
      events: [ProcessorEvent.metric],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter,
        },
      },
      aggs: {
        containerIds: {
          terms: {
            field: CONTAINER_ID,
            size: 500,
          },
        },
        hostNames: {
          terms: {
            field: HOSTNAME,
            size: 500,
          },
        },
        podNames: {
          terms: {
            field: POD_NAME,
            size: 500,
          },
        },
      },
    },
  });

  return {
    containerIds:
      response.aggregations?.containerIds?.buckets.map(
        (bucket) => bucket.key
      ) ?? [],
    hostNames:
      response.aggregations?.hostNames?.buckets.map((bucket) => bucket.key) ??
      [],
    podNames:
      response.aggregations?.podNames?.buckets.map((bucket) => bucket.key) ??
      [],
  };
};
