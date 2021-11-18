/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery } from '../../../../../observability/server';
import {
  ERROR_EXC_MESSAGE,
  ERROR_GROUP_ID,
  ERROR_LOG_MESSAGE,
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { getErrorName } from '../../helpers/get_error_name';
import { Setup } from '../../helpers/setup_request';

export async function getServiceErrorGroupMainStatistics({
  kuery,
  serviceName,
  setup,
  transactionType,
  environment,
  start,
  end,
}: {
  kuery: string;
  serviceName: string;
  setup: Setup;
  transactionType: string;
  environment: string;
  start: number;
  end: number;
}) {
  const { apmEventClient } = setup;

  const response = await apmEventClient.search(
    'get_service_error_group_main_statistics',
    {
      apm: {
        events: [ProcessorEvent.error],
      },
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              { term: { [SERVICE_NAME]: serviceName } },
              { term: { [TRANSACTION_TYPE]: transactionType } },
              ...rangeQuery(start, end),
              ...environmentQuery(environment),
              ...kqlQuery(kuery),
            ],
          },
        },
        aggs: {
          error_groups: {
            terms: {
              field: ERROR_GROUP_ID,
              size: 500,
              order: {
                _count: 'desc',
              },
            },
            aggs: {
              sample: {
                top_hits: {
                  size: 1,
                  _source: [ERROR_LOG_MESSAGE, ERROR_EXC_MESSAGE, '@timestamp'],
                  sort: {
                    '@timestamp': 'desc',
                  },
                },
              },
            },
          },
        },
      },
    }
  );

  const errorGroups =
    response.aggregations?.error_groups.buckets.map((bucket) => ({
      group_id: bucket.key as string,
      name: getErrorName(bucket.sample.hits.hits[0]._source),
      lastSeen: new Date(
        bucket.sample.hits.hits[0]?._source['@timestamp']
      ).getTime(),
      occurrences: bucket.doc_count,
    })) ?? [];

  return {
    is_aggregation_accurate:
      (response.aggregations?.error_groups.sum_other_doc_count ?? 0) === 0,
    error_groups: errorGroups,
  };
}
