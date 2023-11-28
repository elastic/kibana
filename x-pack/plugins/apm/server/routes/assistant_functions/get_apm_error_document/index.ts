/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import datemath from '@elastic/datemath';
import { rangeQuery } from '@kbn/observability-plugin/server';
import * as t from 'io-ts';
import { pick } from 'lodash';
import { ApmDocumentType } from '../../../../common/document_type';
import { RollupInterval } from '../../../../common/rollup';
import { termQuery } from '../../../../common/utils/term_query';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import type { APMError } from '../../../../typings/es_schemas/ui/apm_error';

export const errorRouteRt = t.intersection([
  t.type({
    start: t.string,
    end: t.string,
  }),
  t.partial({
    'error.grouping_name': t.string,
    'service.name': t.string,
  }),
]);

export async function getApmErrorDocument({
  arguments: args,
  apmEventClient,
}: {
  arguments: t.TypeOf<typeof errorRouteRt>;
  apmEventClient: APMEventClient;
}): Promise<Array<Partial<APMError>>> {
  const start = datemath.parse(args.start)?.valueOf()!;
  const end = datemath.parse(args.end)?.valueOf()!;

  const response = await apmEventClient.search('get_error', {
    apm: {
      sources: [
        {
          documentType: ApmDocumentType.ErrorEvent,
          rollupInterval: RollupInterval.None,
        },
      ],
    },
    body: {
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            ...rangeQuery(start, end),
            ...termQuery('error.grouping_name', args['error.grouping_name']),
            ...termQuery('service.name', args['service.name']),
          ],
        },
      },
      size: 0,
      aggs: {
        errorGroups: {
          terms: {
            field: 'error.grouping_name',
            size: 5,
          },
          aggs: {
            sample: {
              top_hits: {
                size: 1,
              },
            },
          },
        },
      },
    },
  });

  return (
    response.aggregations?.errorGroups.buckets.map((bucket) => {
      const source = bucket.sample.hits.hits[0]._source as APMError;

      const formattedResponse = pick(
        source,
        'message',
        'error',
        '@timestamp',
        'transaction.name',
        'transaction.type',
        'span.name',
        'span.type',
        'span.subtype'
      );

      return formattedResponse;
    }) ?? []
  );
}
