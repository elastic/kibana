/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { rangeQuery } from '@kbn/observability-plugin/server';
import datemath from '@elastic/datemath';
import { pick } from 'lodash';
import { ApmDocumentType } from '../../../../common/document_type';
import { RollupInterval } from '../../../../common/rollup';
import { termQuery } from '../../../../common/utils/term_query';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { APMError } from '../../../../typings/es_schemas/ui/apm_error';

export const errorRouteRt = t.type({
  start: t.string,
  end: t.string,
  'error.grouping_name': t.string,
});

export async function getApmErrorDocument({
  arguments: args,
  apmEventClient,
}: {
  arguments: t.TypeOf<typeof errorRouteRt>;
  apmEventClient: APMEventClient;
}) {
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
      size: 1,
      terminate_after: 1,
      query: {
        bool: {
          filter: [
            ...rangeQuery(start, end),
            ...termQuery('error.grouping_name', args['error.grouping_name']),
          ],
        },
      },
    },
  });

  const error = response.hits.hits[0]?._source as APMError;

  if (!error) {
    return undefined;
  }

  return pick(
    error,
    'message',
    'error',
    '@timestamp',
    'transaction.name',
    'transaction.type',
    'span.name',
    'span.type',
    'span.subtype'
  );
}
