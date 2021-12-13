/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { withApmSpan } from '../../../../utils/with_apm_span';
import {
  SERVICE_NAME,
  TRACE_ID,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  TRANSACTION_SAMPLED,
  TRANSACTION_TYPE,
} from '../../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../../common/processor_event';
import {
  rangeQuery,
  kqlQuery,
  termsQuery,
  termQuery,
} from '../../../../../../observability/server';
import { environmentQuery } from '../../../../../common/utils/environment_query';
import { APMEventClient } from '../../../../lib/helpers/create_es_client/create_apm_event_client';

const TRACE_SAMPLES_SIZE = 500;

export interface TraceSample {
  traceId: string;
  transactionId: string;
}

export async function getTraceSamples({
  environment,
  kuery,
  serviceName,
  transactionName,
  transactionType,
  transactionId,
  traceIds,
  sampleRangeFrom,
  sampleRangeTo,
  apmEventClient,
  start,
  end,
}: {
  environment: string;
  kuery: string;
  serviceName?: string;
  transactionName?: string;
  transactionType?: string;
  transactionId?: string;
  traceIds: string[];
  sampleRangeFrom?: number;
  sampleRangeTo?: number;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
}) {
  return withApmSpan('get_trace_samples', async () => {
    const commonFilters = [
      ...termQuery(SERVICE_NAME, serviceName),
      ...termQuery(TRANSACTION_TYPE, transactionType),
      ...termQuery(TRANSACTION_NAME, transactionName),
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

    async function getTraceSamplesHits() {
      const response = await apmEventClient.search('get_trace_samples_hits', {
        apm: {
          events: [ProcessorEvent.transaction],
        },
        body: {
          query: {
            bool: {
              filter: [
                ...commonFilters,
                { term: { [TRANSACTION_SAMPLED]: true } },
              ],
              should: [
                ...termsQuery(TRACE_ID, ...traceIds),
                ...termQuery(TRANSACTION_ID, transactionId),
              ] as QueryDslQueryContainer[],
            },
          },
          size: TRACE_SAMPLES_SIZE,
        },
      });

      return response.hits.hits.map((hit) => ({
        transactionId: hit._source.transaction.id,
        traceId: hit._source.trace.id,
      }));
    }

    return {
      traceSamples: await getTraceSamplesHits(),
    };
  });
}
