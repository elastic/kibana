/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { rangeQuery, kqlQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { orderBy } from 'lodash';
import { withApmSpan } from '../../../utils/with_apm_span';
import {
  SERVICE_NAME,
  TRACE_ID,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  TRANSACTION_SAMPLED,
  TRANSACTION_TYPE,
} from '../../../../common/es_fields/apm';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

const TRACE_SAMPLES_SIZE = 500;

export async function getTraceSamples({
  environment,
  kuery,
  serviceName,
  transactionName,
  transactionType,
  transactionId,
  traceId,
  sampleRangeFrom,
  sampleRangeTo,
  apmEventClient,
  start,
  end,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  transactionName: string;
  transactionType: string;
  transactionId: string;
  traceId: string;
  sampleRangeFrom?: number;
  sampleRangeTo?: number;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
}) {
  return withApmSpan('get_trace_samples', async () => {
    const commonFilters = [
      { term: { [SERVICE_NAME]: serviceName } },
      { term: { [TRANSACTION_TYPE]: transactionType } },
      { term: { [TRANSACTION_NAME]: transactionName } },
      ...rangeQuery(start, end),
      ...environmentQuery(environment),
      ...kqlQuery(kuery),
    ] as QueryDslQueryContainer[];

    if (sampleRangeFrom !== undefined && sampleRangeTo !== undefined) {
      commonFilters.push({
        range: {
          'transaction.duration.us': {
            gte: sampleRangeFrom,
            lte: sampleRangeTo,
          },
        },
      });
    }

    const response = await apmEventClient.search('get_trace_samples_hits', {
      apm: {
        events: [ProcessorEvent.transaction],
      },
      _source: [TRANSACTION_ID, TRACE_ID, '@timestamp'],
      body: {
        track_total_hits: false,
        query: {
          bool: {
            filter: [
              ...commonFilters,
              { term: { [TRANSACTION_SAMPLED]: true } },
            ],
            should: [
              { term: { [TRACE_ID]: traceId } },
              { term: { [TRANSACTION_ID]: transactionId } },
            ] as QueryDslQueryContainer[],
          },
        },
        size: TRACE_SAMPLES_SIZE,
      },
    });

    const traceSamples = orderBy(
      response.hits.hits.map((hit) => ({
        score: hit._score,
        timestamp: hit._source['@timestamp'],
        transactionId: hit._source.transaction.id,
        traceId: hit._source.trace.id,
      })),
      ['score', 'timestamp'],
      ['desc', 'desc']
    );

    return { traceSamples };
  });
}
