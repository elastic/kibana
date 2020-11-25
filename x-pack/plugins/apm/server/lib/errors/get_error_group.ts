/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PromiseReturnType } from '../../../../observability/typings/common';
import {
  ERROR_GROUP_ID,
  SERVICE_NAME,
  TRANSACTION_SAMPLED,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { rangeFilter } from '../../../common/utils/range_filter';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { getTransaction } from '../transactions/get_transaction';

export type ErrorGroupAPIResponse = PromiseReturnType<typeof getErrorGroup>;

// TODO: rename from "getErrorGroup"  to "getErrorGroupSample" (since a single error is returned, not an errorGroup)
export async function getErrorGroup({
  serviceName,
  groupId,
  setup,
}: {
  serviceName: string;
  groupId: string;
  setup: Setup & SetupTimeRange;
}) {
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
            { range: rangeFilter(start, end) },
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
}
