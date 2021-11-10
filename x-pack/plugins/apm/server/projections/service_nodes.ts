/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SERVICE_NAME,
  SERVICE_NODE_NAME,
} from '../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../common/processor_event';
import { kqlQuery, rangeQuery } from '../../../observability/server';
import {
  environmentQuery,
  serviceNodeNameQuery,
} from '../../common/utils/environment_query';

export function getServiceNodesProjection({
  serviceName,
  serviceNodeName,
  environment,
  kuery,
  start,
  end,
}: {
  serviceName: string;
  serviceNodeName?: string;
  environment: string;
  kuery: string;
  start: number;
  end: number;
}) {
  return {
    apm: {
      events: [ProcessorEvent.metric],
    },
    body: {
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            ...serviceNodeNameQuery(serviceNodeName),
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
          ],
        },
      },
      aggs: {
        nodes: {
          terms: {
            field: SERVICE_NODE_NAME,
          },
        },
      },
    },
  };
}
