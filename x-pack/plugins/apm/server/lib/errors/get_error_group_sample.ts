/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ERROR_GROUP_ID,
  SERVICE_NAME,
  TRANSACTION_SAMPLED,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { environmentQuery, rangeQuery } from '../../../common/utils/queries';
import { withApmSpan } from '../../utils/with_apm_span';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { getTransaction } from '../transactions/get_transaction';

export function getErrorGroupSample({
  environment,
  serviceName,
  groupId,
  setup,
}: {
  environment?: string;
  serviceName: string;
  groupId: string;
  setup: Setup & SetupTimeRange;
}) {
  return withApmSpan('get_error_group_sample', async () => {
    const { start, end, esFilter, apmEventClient } = setup;

    const params = {
      apm: {
        events: [ProcessorEvent.error as const],
      },
      body: {
        size: 1,
        query: {
          bool: {
            filter: [
              { term: { [SERVICE_NAME]: serviceName } },
              { term: { [ERROR_GROUP_ID]: groupId } },
              ...rangeQuery(start, end),
              ...environmentQuery(environment),
              ...esFilter,
            ],
            should: [{ term: { [TRANSACTION_SAMPLED]: true } }],
          },
        },
        sort: [
          { _score: 'desc' }, // sort by _score first to ensure that errors with transaction.sampled:true ends up on top
          { '@timestamp': { order: 'desc' } }, // sort by timestamp to get the most recent error
        ],
      },
    };

    const resp = await apmEventClient.search(params);
    const error = resp.hits.hits[0]?._source;
    const transactionId = error?.transaction?.id;
    const traceId = error?.trace?.id;

    let transaction;
    if (transactionId && traceId) {
      transaction = await getTransaction({ transactionId, traceId, setup });
    }

    return {
      transaction,
      error,
      occurrencesCount: resp.hits.total.value,
    };
  });
}
