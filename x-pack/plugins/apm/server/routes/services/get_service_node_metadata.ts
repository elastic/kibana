/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { Setup } from '../../lib/helpers/setup_request';
import {
  HOST_NAME,
  CONTAINER_ID,
} from '../../../common/elasticsearch_fieldnames';
import { NOT_AVAILABLE_LABEL } from '../../../common/i18n';
import {
  SERVICE_NAME,
  SERVICE_NODE_NAME,
} from '../../../common/elasticsearch_fieldnames';
import {
  environmentQuery,
  serviceNodeNameQuery,
} from '../../../common/utils/environment_query';

export async function getServiceNodeMetadata({
  kuery,
  serviceName,
  serviceNodeName,
  setup,
  start,
  end,
  environment,
}: {
  kuery: string;
  serviceName: string;
  serviceNodeName: string;
  setup: Setup;
  start: number;
  end: number;
  environment: string;
}) {
  const { apmEventClient } = setup;

  const params = {
    apm: {
      events: [ProcessorEvent.metric],
    },
    body: {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
            ...serviceNodeNameQuery(serviceNodeName),
          ],
        },
      },
      aggs: {
        nodes: {
          terms: {
            field: SERVICE_NODE_NAME,
          },
        },
        host: {
          terms: {
            field: HOST_NAME,
            size: 1,
          },
        },
        containerId: {
          terms: {
            field: CONTAINER_ID,
            size: 1,
          },
        },
      },
    },
  };

  const response = await apmEventClient.search(
    'get_service_node_metadata',
    params
  );

  return {
    host: response.aggregations?.host.buckets[0]?.key || NOT_AVAILABLE_LABEL,
    containerId:
      response.aggregations?.containerId.buckets[0]?.key || NOT_AVAILABLE_LABEL,
  };
}
