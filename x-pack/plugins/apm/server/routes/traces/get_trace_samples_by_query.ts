/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  rangeQuery,
  kqlQuery,
  termsQuery,
} from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { Environment } from '../../../common/environment_rt';
import { TraceSearchType } from '../../../common/trace_explorer';
import { environmentQuery } from '../../../common/utils/environment_query';
import {
  PARENT_ID,
  PROCESSOR_EVENT,
  TRACE_ID,
  TRANSACTION_ID,
  TRANSACTION_SAMPLED,
} from '../../../common/es_fields/apm';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export type TraceSamplesResponse = Array<{
  traceId: string;
  transactionId: string;
}>;

export async function getTraceSamplesByQuery({
  apmEventClient,
  start,
  end,
  environment,
  query,
  type,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  environment: Environment;
  query: string;
  type: TraceSearchType;
}): Promise<TraceSamplesResponse> {
  const size = 500;

  let traceIds: string[] = [];

  if (type === TraceSearchType.kql) {
    traceIds =
      (
        await apmEventClient.search('get_trace_ids_by_kql_query', {
          apm: {
            events: [
              ProcessorEvent.transaction,
              ProcessorEvent.span,
              ProcessorEvent.error,
            ],
          },
          body: {
            track_total_hits: false,
            size: 0,
            query: {
              bool: {
                filter: [
                  ...rangeQuery(start, end),
                  ...environmentQuery(environment),
                  ...kqlQuery(query),
                ],
              },
            },
            aggs: {
              traceId: {
                terms: {
                  field: TRACE_ID,
                  execution_hint: 'map',
                  size,
                },
              },
            },
          },
        })
      ).aggregations?.traceId.buckets.map((bucket) => bucket.key as string) ??
      [];
  } else if (type === TraceSearchType.eql) {
    traceIds =
      (
        await apmEventClient.eqlSearch('get_trace_ids_by_eql_query', {
          apm: {
            events: [
              ProcessorEvent.transaction,
              ProcessorEvent.span,
              ProcessorEvent.error,
            ],
          },
          size: 1000,
          filter: {
            bool: {
              filter: [
                ...rangeQuery(start, end),
                ...environmentQuery(environment),
              ],
            },
          },
          event_category_field: PROCESSOR_EVENT,
          query,
          filter_path: 'hits.sequences.events._source.trace.id',
        })
      ).hits?.sequences?.flatMap((sequence) =>
        sequence.events.map(
          (event) => (event._source as { trace: { id: string } }).trace.id
        )
      ) ?? [];
  }

  if (!traceIds.length) {
    return [];
  }

  const traceSamplesResponse = await apmEventClient.search(
    'get_trace_samples_by_trace_ids',
    {
      apm: {
        events: [ProcessorEvent.transaction],
      },
      body: {
        track_total_hits: false,
        size: 0,
        query: {
          bool: {
            filter: [
              {
                term: {
                  [TRANSACTION_SAMPLED]: true,
                },
              },
              ...termsQuery(TRACE_ID, ...traceIds),
              ...rangeQuery(start, end),
            ],
            must_not: [{ exists: { field: PARENT_ID } }],
          },
        },
        aggs: {
          transactionId: {
            terms: {
              field: TRANSACTION_ID,
              size,
            },
            aggs: {
              latest: {
                top_metrics: {
                  metrics: asMutableArray([{ field: TRACE_ID }] as const),
                  size: 1,
                  sort: {
                    '@timestamp': 'desc' as const,
                  },
                },
              },
            },
          },
        },
      },
    }
  );

  return (
    traceSamplesResponse.aggregations?.transactionId.buckets.map((bucket) => ({
      traceId: bucket.latest.top[0].metrics['trace.id'] as string,
      transactionId: bucket.key as string,
    })) ?? []
  );
}
