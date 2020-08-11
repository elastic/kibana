/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ProcessorEvent } from '../../../common/processor_event';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { rangeFilter } from '../../../common/utils/range_filter';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { ENVIRONMENT_NOT_DEFINED } from '../../../common/environment_filter_values';
import { ESFilter } from '../../../typings/elasticsearch';

export async function getEnvironments(
  setup: Setup & SetupTimeRange,
  serviceName?: string
) {
  const { start, end, apmEventClient } = setup;

  const filter: ESFilter[] = [{ range: rangeFilter(start, end) }];

  if (serviceName) {
    filter.push({
      term: { [SERVICE_NAME]: serviceName },
    });
  }

  const params = {
    apm: {
      events: [
        ProcessorEvent.transaction,
        ProcessorEvent.metric,
        ProcessorEvent.error,
      ],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter,
        },
      },
      aggs: {
        environments: {
          terms: {
            field: SERVICE_ENVIRONMENT,
            missing: ENVIRONMENT_NOT_DEFINED,
          },
        },
      },
    },
  };

  const resp = await apmEventClient.search(params);
  const aggs = resp.aggregations;
  const environmentsBuckets = aggs?.environments.buckets || [];

  const environments = environmentsBuckets.map(
    (environmentBucket) => environmentBucket.key as string
  );

  return environments;
}
