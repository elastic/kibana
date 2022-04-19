/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, kqlQuery } from '@kbn/observability-plugin/server';
import { Setup } from '../../lib/helpers/setup_request';
import { environmentQuery } from '../../../common/utils/environment_query';
import { ProcessorEvent } from '../../../common/processor_event';
import {
  SERVICE_NAME,
  CONTAINER_ID,
  HOST_NAME,
} from '../../../common/elasticsearch_fieldnames';

export const getServiceInfrastructure = async ({
  kuery,
  serviceName,
  environment,
  setup,
  start,
  end,
}: {
  kuery: string;
  serviceName: string;
  environment: string;
  setup: Setup;
  start: number;
  end: number;
}) => {
  const { apmEventClient } = setup;

  const response = await apmEventClient.search('get_service_infrastructure', {
    apm: {
      events: [ProcessorEvent.metric],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
          ],
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
            field: HOST_NAME,
            size: 500,
          },
        },
      },
    },
  });

  return {
    containerIds:
      response.aggregations?.containerIds?.buckets.map(
        (bucket) => bucket.key as string
      ) ?? [],
    hostNames:
      response.aggregations?.hostNames?.buckets.map(
        (bucket) => bucket.key as string
      ) ?? [],
  };
};
