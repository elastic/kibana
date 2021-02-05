/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESFilter } from '../../../../../../typings/elasticsearch';
import {
  ERROR_GROUP_ID,
  SERVICE_NAME,
} from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { rangeQuery } from '../../../../common/utils/queries';
import { getEnvironmentFilter } from '../../helpers/get_environment_filter';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';

export async function getBuckets({
  environment,
  serviceName,
  groupId,
  bucketSize,
  setup,
}: {
  environment?: string;
  serviceName: string;
  groupId?: string;
  bucketSize: number;
  setup: Setup & SetupTimeRange;
}) {
  const { start, end, esFilter, apmEventClient } = setup;
  const filter: ESFilter[] = [
    { term: { [SERVICE_NAME]: serviceName } },
    rangeQuery(start, end),
    ...getEnvironmentFilter(environment),
    ...esFilter,
  ];

  if (groupId) {
    filter.push({ term: { [ERROR_GROUP_ID]: groupId } });
  }

  const params = {
    apm: {
      events: [ProcessorEvent.error],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter,
        },
      },
      aggs: {
        distribution: {
          histogram: {
            field: '@timestamp',
            min_doc_count: 0,
            interval: bucketSize,
            extended_bounds: {
              min: start,
              max: end,
            },
          },
        },
      },
    },
  };

  const resp = await apmEventClient.search(params);

  const buckets = (resp.aggregations?.distribution.buckets || []).map(
    (bucket) => ({
      key: bucket.key,
      count: bucket.doc_count,
    })
  );

  return {
    noHits: resp.hits.total.value === 0,
    buckets: resp.hits.total.value > 0 ? buckets : [],
  };
}
