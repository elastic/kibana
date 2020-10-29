/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { maybe } from '../../../common/utils/maybe';
import {
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_SAMPLED,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { rangeFilter } from '../../../common/utils/range_filter';
import { Setup, SetupTimeRange } from '../helpers/setup_request';

export async function getTransactionSampleForGroup({
  serviceName,
  transactionName,
  setup,
}: {
  serviceName: string;
  transactionName: string;
  setup: Setup & SetupTimeRange;
}) {
  const { apmEventClient, start, end, esFilter } = setup;

  const filter = [
    {
      range: rangeFilter(start, end),
    },
    {
      term: {
        [SERVICE_NAME]: serviceName,
      },
    },
    {
      term: {
        [TRANSACTION_NAME]: transactionName,
      },
    },
    ...esFilter,
  ];

  const getSampledTransaction = async () => {
    const response = await apmEventClient.search({
      terminateAfter: 1,
      apm: {
        events: [ProcessorEvent.transaction],
      },
      body: {
        size: 1,
        query: {
          bool: {
            filter: [...filter, { term: { [TRANSACTION_SAMPLED]: true } }],
          },
        },
      },
    });

    return maybe(response.hits.hits[0]?._source);
  };

  const getUnsampledTransaction = async () => {
    const response = await apmEventClient.search({
      terminateAfter: 1,
      apm: {
        events: [ProcessorEvent.transaction],
      },
      body: {
        size: 1,
        query: {
          bool: {
            filter: [...filter, { term: { [TRANSACTION_SAMPLED]: false } }],
          },
        },
      },
    });

    return maybe(response.hits.hits[0]?._source);
  };

  const [sampledTransaction, unsampledTransaction] = await Promise.all([
    getSampledTransaction(),
    getUnsampledTransaction(),
  ]);

  return sampledTransaction || unsampledTransaction;
}
