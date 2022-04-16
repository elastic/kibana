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
} from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { Setup } from '../../../lib/helpers/setup_request';

export async function getBuckets({
  environment,
  kuery,
  serviceName,
  groupId,
  bucketSize,
  setup,
  start,
  end,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  groupId?: string;
  bucketSize: number;
  setup: Setup;
  start: number;
  end: number;
}) {
  const { apmEventClient } = setup;

  const params = {
    apm: {
      events: [ProcessorEvent.error],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
            ...termQuery(ERROR_GROUP_ID, groupId),
          ],
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

  const resp = await apmEventClient.search(
    'get_error_distribution_buckets',
    params
  );

  const buckets = (resp.aggregations?.distribution.buckets || []).map(
    (bucket) => ({
      x: bucket.key,
      y: bucket.doc_count,
    })
  );
  return { buckets };
}
