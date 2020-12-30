/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup, SetupTimeRange } from '../../server/lib/helpers/setup_request';
import {
  SERVICE_NAME,
  SERVICE_NODE_NAME,
} from '../../common/elasticsearch_fieldnames';
import { rangeFilter } from '../../common/utils/range_filter';
import { SERVICE_NODE_NAME_MISSING } from '../../common/service_nodes';
import { ProcessorEvent } from '../../common/processor_event';

function getServiceNodeNameFilters(serviceNodeName?: string) {
  if (!serviceNodeName) {
    return [];
  }

  if (serviceNodeName === SERVICE_NODE_NAME_MISSING) {
    return [{ bool: { must_not: [{ exists: { field: SERVICE_NODE_NAME } }] } }];
  }

  return [{ term: { [SERVICE_NODE_NAME]: serviceNodeName } }];
}

export function getMetricsProjection({
  setup,
  serviceName,
  serviceNodeName,
}: {
  setup: Setup & SetupTimeRange;
  serviceName: string;
  serviceNodeName?: string;
}) {
  const { start, end, esFilter } = setup;

  const filter = [
    { term: { [SERVICE_NAME]: serviceName } },
    { range: rangeFilter(start, end) },
    ...getServiceNodeNameFilters(serviceNodeName),
    ...esFilter,
  ];

  return {
    apm: {
      events: [ProcessorEvent.metric],
    },
    body: {
      query: {
        bool: {
          filter,
        },
      },
    },
  };
}
