/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ValuesType } from 'utility-types';
import { orderBy } from 'lodash';
import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';
import { PromiseReturnType } from '../../../../../observability/typings/common';
import { rangeFilter } from '../../../../common/utils/range_filter';
import { ProcessorEvent } from '../../../../common/processor_event';
import {
  ERROR_EXC_MESSAGE,
  ERROR_GROUP_ID,
  ERROR_LOG_MESSAGE,
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { getErrorName } from '../../helpers/get_error_name';

export type ServiceErrorGroupItem = ValuesType<
  PromiseReturnType<typeof getServiceErrorGroups>
>;

export async function getServiceErrorGroups({
  serviceName,
  setup,
  transactionType,
}: {
  serviceName: string;
  setup: Setup & SetupTimeRange;
  transactionType: string;
}) {
  const { apmEventClient, start, end, esFilter } = setup;

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
            { range: rangeFilter(start, end) },
            ...esFilter,
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
        getErrorName(bucket.sample.hits.hits[0]._source) ?? NOT_AVAILABLE_LABEL,
      last_seen: new Date(
        bucket.sample.hits.hits[0]?._source['@timestamp']
      ).getTime(),
      occurrences: {
        value: bucket.doc_count,
      },
    })) ?? [];

  const sortedErrorGroups = orderBy(
    errorGroups,
    (group) => group.occurrences.value,
    'desc'
  );

  return {
    is_aggregation_accurate:
      (response.aggregations?.error_groups.sum_other_doc_count ?? 0) === 0,
    error_groups: sortedErrorGroups,
  };
}
