/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, kqlQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import {
  ERROR_EXC_HANDLED,
  ERROR_GROUP_ID,
  SERVICE_NAME,
  TRANSACTION_SAMPLED,
} from '../../../../common/es_fields/apm';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

const HITS_LIMIT = 10000;

export async function getErrorGroupSummary({
  environment,
  kuery,
  serviceName,
  groupId,
  apmEventClient,
  start,
  end,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  groupId: string;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
}) {
  const params = {
    apm: {
      events: [ProcessorEvent.error as const],
    },
    body: {
      track_total_hits: HITS_LIMIT,
      size: 1,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [ERROR_GROUP_ID]: groupId } },
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
          ],
          should: [{ term: { [TRANSACTION_SAMPLED]: true } }],
        },
      },
      _source: [ERROR_EXC_HANDLED],
      sort: asMutableArray([
        { _score: { order: 'desc' } }, // sort by _score first to ensure that errors with transaction.sampled:true ends up on top
        { '@timestamp': { order: 'desc' } }, // sort by timestamp to get the most recent error
      ] as const),
    },
  };

  const resp = await apmEventClient.search('get_error_group_summary', params);
  const error = resp.hits.hits[0]._source.error;

  return {
    error,
    occurrencesCount: resp.hits.total.value,
  };
}
