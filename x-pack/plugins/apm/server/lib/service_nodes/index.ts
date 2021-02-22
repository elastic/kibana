/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  METRIC_JAVA_HEAP_MEMORY_USED,
  METRIC_JAVA_NON_HEAP_MEMORY_USED,
  METRIC_JAVA_THREAD_COUNT,
  METRIC_PROCESS_CPU_PERCENT,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { SERVICE_NODE_NAME_MISSING } from '../../../common/service_nodes';
import { rangeQuery } from '../../../common/utils/queries';
import { withApmSpan } from '../../utils/with_apm_span';
import { Setup, SetupTimeRange } from '../helpers/setup_request';

const getServiceNodes = ({
  setup,
  serviceName,
}: {
  setup: Setup & SetupTimeRange;
  serviceName: string;
}) => {
  return withApmSpan('get_service_nodes', async () => {
    const { apmEventClient, esFilter, start, end } = setup;

    const params = {
      apm: {
        events: [ProcessorEvent.metric],
      },
      body: {
        aggs: {
          nodes: {
            terms: {
              field: SERVICE_NODE_NAME,
              size: 10000,
              missing: SERVICE_NODE_NAME_MISSING,
            },
            aggs: {
              cpu: {
                avg: {
                  field: METRIC_PROCESS_CPU_PERCENT,
                },
              },
              heapMemory: {
                avg: {
                  field: METRIC_JAVA_HEAP_MEMORY_USED,
                },
              },
              nonHeapMemory: {
                avg: {
                  field: METRIC_JAVA_NON_HEAP_MEMORY_USED,
                },
              },
              threadCount: {
                max: {
                  field: METRIC_JAVA_THREAD_COUNT,
                },
              },
            },
          },
        },
        query: {
          bool: {
            filter: [
              { term: { [SERVICE_NAME]: serviceName } },
              ...rangeQuery(start, end),
              ...esFilter,
            ],
          },
        },
      },
    };

    const response = await apmEventClient.search(params);

    if (!response.aggregations) {
      return [];
    }

    return response.aggregations.nodes.buckets
      .map((bucket) => ({
        name: bucket.key as string,
        cpu: bucket.cpu.value,
        heapMemory: bucket.heapMemory.value,
        nonHeapMemory: bucket.nonHeapMemory.value,
        threadCount: bucket.threadCount.value,
      }))
      .filter(
        (item) =>
          item.cpu !== null ||
          item.heapMemory !== null ||
          item.nonHeapMemory !== null ||
          item.threadCount != null
      );
  });
};

export { getServiceNodes };
