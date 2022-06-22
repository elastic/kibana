/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  rangeQuery,
  kqlQuery,
  termQuery,
} from '@kbn/observability-plugin/server';
import {
  ERROR_GROUP_ID,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
  ERROR_LOG_MESSAGE,
  ERROR_EXC_MESSAGE,
} from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { Setup } from '../../../lib/helpers/setup_request';
import { getErrorName } from '../../../lib/helpers/get_error_name';

export async function getTopErrorsForTransaction({
  environment,
  kuery,
  serviceName,
  transactionName,
  transactionType,
  setup,
  start,
  end,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  transactionName: string;
  transactionType: string;
  setup: Setup;
  start: number;
  end: number;
}) {
  const { apmEventClient } = setup;

  const res = await apmEventClient.search('get_top_errors_for_transaction', {
    apm: {
      events: [ProcessorEvent.error],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            ...termQuery(SERVICE_NAME, serviceName),
            ...termQuery(TRANSACTION_NAME, transactionName),
            ...termQuery(TRANSACTION_TYPE, transactionType),
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
          ],
        },
      },
      aggs: {
        top_five_errors: {
          terms: {
            field: ERROR_GROUP_ID,
            size: 5,
          },
          aggs: {
            sample: {
              top_hits: {
                size: 1,
                _source: [ERROR_LOG_MESSAGE, ERROR_EXC_MESSAGE],
              },
            },
          },
        },
      },
    },
  });

  return {
    topErrors:
      res.aggregations?.top_five_errors.buckets.map(
        ({ key, doc_count: docCount, sample }) => ({
          groupId: key as string,
          errorName: getErrorName(sample.hits.hits[0]._source),
          errorRatio: docCount / res.hits.total.value,
        })
      ) ?? [],
  };
}
