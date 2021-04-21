/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ERROR_EXC_MESSAGE,
  ERROR_GROUP_ID,
  ERROR_LOG_MESSAGE,
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';
import { ProcessorEvent } from '../../../../common/processor_event';
import {
  environmentQuery,
  rangeQuery,
  kqlQuery,
} from '../../../../server/utils/queries';
import { withApmSpan } from '../../../utils/with_apm_span';
import { getErrorName } from '../../helpers/get_error_name';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';

export function getServiceErrorGroupMainStatistics({
  kuery,
  serviceName,
  setup,
  transactionType,
  environment,
}: {
  kuery?: string;
  serviceName: string;
  setup: Setup & SetupTimeRange;
  transactionType: string;
  environment?: string;
}) {
  return withApmSpan('get_service_error_group_main_statistics', async () => {
    const { apmEventClient, start, end } = setup;

    const response = await apmEventClient.search({
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
    });

    const errorGroups =
      response.aggregations?.error_groups.buckets.map((bucket) => ({
        group_id: bucket.key as string,
        name:
          getErrorName(bucket.sample.hits.hits[0]._source) ??
          NOT_AVAILABLE_LABEL,
        last_seen: new Date(
          bucket.sample.hits.hits[0]?._source['@timestamp']
        ).getTime(),
        occurrences: bucket.doc_count,
      })) ?? [];

    return {
      is_aggregation_accurate:
        (response.aggregations?.error_groups.sum_other_doc_count ?? 0) === 0,
      error_groups: errorGroups,
    };
  });
}
