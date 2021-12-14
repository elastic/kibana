/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { uniq, last } from 'lodash';
import { rangeQuery } from '../../../../observability/server';
import { Environment } from '../../../common/environment_rt';
import { ProcessorEvent } from '../../../common/processor_event';
import { environmentQuery } from '../../../common/utils/environment_query';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export async function getTraceIdsFromEql({
  apmEventClient,
  query,
  numTraceIds,
  environment,
  start,
  end,
  after,
}: {
  apmEventClient: APMEventClient;
  query: string;
  numTraceIds: number;
  environment: Environment;
  start: number;
  end: number;
  after: Record<string, any> | undefined;
}) {
  let traceIds: string[] = [];

  const startAt =
    after && '@timestamp' in after
      ? Math.max(start, new Date(after['@timestamp']).getTime() + 1)
      : start;

  const response = await apmEventClient.eqlSearch('get_trace_ids_from_eql', {
    apm: {
      events: [
        ProcessorEvent.transaction,
        ProcessorEvent.span,
        ProcessorEvent.error,
      ],
    },
    filter: {
      bool: {
        filter: [...environmentQuery(environment), ...rangeQuery(startAt, end)],
      },
    },
    query,
    size: numTraceIds,
    event_category_field: 'processor.event',
    timestamp_field: '@timestamp',
  });

  if (response.hits.events) {
    traceIds = uniq(
      response.hits.events.map((event) => event._source.trace!.id)
    );
  } else if (response.hits.sequences) {
    traceIds = uniq(
      response.hits.sequences.flatMap((sequence) =>
        sequence.events.map((event) => event._source.trace!.id)
      )
    );
  }

  return {
    traceIds,
    after:
      traceIds.length > 0
        ? {
            '@timestamp': last(response.hits.events)?._source['@timestamp'],
          }
        : undefined,
  };
}
