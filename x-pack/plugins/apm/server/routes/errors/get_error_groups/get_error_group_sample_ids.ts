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
  ERROR_GROUP_ID,
  ERROR_ID,
  SERVICE_NAME,
  TRANSACTION_SAMPLED,
} from '../../../../common/es_fields/apm';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

const ERROR_SAMPLES_SIZE = 10000;

export async function getErrorGroupSampleIds({
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
      track_total_hits: ERROR_SAMPLES_SIZE,
      size: ERROR_SAMPLES_SIZE,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [ERROR_GROUP_ID]: groupId } },
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
          ],
          should: [{ term: { [TRANSACTION_SAMPLED]: true } }], // prefer error samples with related transactions
        },
      },
      _source: [ERROR_ID],
      sort: asMutableArray([
        { _score: { order: 'desc' } }, // sort by _score first to ensure that errors with transaction.sampled:true ends up on top
        { '@timestamp': { order: 'desc' } }, // sort by timestamp to get the most recent error
      ] as const),
    },
  };

  const resp = await apmEventClient.search(
    'get_error_group_sample_ids',
    params
  );
  const errorSampleIds = resp.hits.hits.map((item) => item._source.error.id);

  return {
    errorSampleIds,
    occurrencesCount: resp.hits.total.value,
  };
}
