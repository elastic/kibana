/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { rangeQuery } from '../../../../observability/server';
import {
  AGENT_NAME,
  PARENT_ID,
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_ID,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  TRACE_ID,
  TRANSACTION_ID,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import {
  ConnectionNode,
  ExternalConnectionNode,
  ServiceConnectionNode,
} from '../../../common/service_map';
import { Setup } from '../../lib/helpers/setup_request';
import { getServicePathsFromTraceIds } from './get_service_paths_from_trace_ids';

export async function fetchServicePathsFromTraceIds(
  setup: Setup,
  traceIds: string[],
  start: number,
  end: number
) {
  // make sure there's a range so ES can skip shards
  const dayInMs = 24 * 60 * 60 * 1000;
  const startRange = start - dayInMs;
  const endRange = end + dayInMs;

  const response = await fetchTraces({
    setup,
    traceIds,
    startRange,
    endRange,
  });

  const servicePaths = await getServicePathsFromTraceIds({
    servicePathsFromTraceIds: response,
  });

  return {
    aggregations: {
      service_map: {
        value: servicePaths,
      },
    },
  } as {
    aggregations?: {
      service_map: {
        value: {
          paths: ConnectionNode[][];
          discoveredServices: Array<{
            from: ExternalConnectionNode;
            to: ServiceConnectionNode;
          }>;
        };
      };
    };
  };
}

export type ServicePathsFromTraceIds = Awaited<ReturnType<typeof fetchTraces>>;

async function fetchTraces({
  setup,
  traceIds,
  startRange,
  endRange,
}: {
  setup: Setup;
  traceIds: string[];
  startRange: number;
  endRange: number;
}) {
  const { apmEventClient } = setup;

  async function fetch({ from, size }: { from: number; size: number }) {
    const hitsParams = {
      apm: {
        events: [ProcessorEvent.span, ProcessorEvent.transaction],
      },
      body: {
        from,
        size,
        _source: [
          '@timestamp',
          PARENT_ID,
          SERVICE_NAME,
          SERVICE_ENVIRONMENT,
          TRACE_ID,
          PROCESSOR_EVENT,
          SPAN_ID,
          SPAN_TYPE,
          SPAN_SUBTYPE,
          SPAN_DESTINATION_SERVICE_RESOURCE,
          AGENT_NAME,
          TRANSACTION_ID,
        ],
        query: {
          bool: {
            filter: [
              { terms: { [TRACE_ID]: traceIds } },
              ...rangeQuery(startRange, endRange),
            ],
          },
        },
      },
    };

    return await apmEventClient.search(
      'fetch_service_paths_from_trace_ids',
      hitsParams
    );
  }
  const hits = [];
  let pageIndex = 0;
  const pageSize = 1000;
  const promises = [];

  // Fetch first page
  const firstPageResult = await fetch({
    from: pageIndex * pageSize,
    size: pageSize,
  });
  hits.push(...firstPageResult.hits.hits);

  // Round up to guarantee all items will be fetched and minus 1 because we've already fetched the first page
  const totalPagesAvailable =
    Math.ceil(firstPageResult.hits.total.value / pageSize) - 1;
  let hasNext = pageIndex < totalPagesAvailable;

  while (hasNext) {
    promises.push(
      fetch({
        from: pageIndex * pageSize,
        size: pageSize,
      })
    );
    pageIndex++;
    hasNext = pageIndex < totalPagesAvailable;
  }

  const pagesResult = await Promise.all(promises);
  pagesResult.forEach((data) => {
    hits.push(...data.hits.hits);
  });
  return hits;
}
