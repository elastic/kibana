/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '../../../common/processor_event';
import { SERVICE_NAME } from '../../../common/elasticsearch_fieldnames';
import { rangeQuery, termQuery } from '../../../../observability/server';
import { environmentQuery } from '../../../common/utils/environment_query';
import { Setup } from '../../lib/helpers/setup_request';
import { ENVIRONMENT_NOT_DEFINED } from '../../../common/environment_filter_values';

export async function getHasNotDefinedEnvironment({
  setup,
  serviceName,
  start,
  end,
}: {
  setup: Setup;
  serviceName?: string;
  start?: number;
  end?: number;
}) {
  const { apmEventClient } = setup;

  const params = {
    terminate_after: 1,
    apm: {
      events: [
        ProcessorEvent.error,
        ProcessorEvent.metric,
        ProcessorEvent.transaction,
      ],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            ...termQuery(SERVICE_NAME, serviceName),
            ...(start && end ? rangeQuery(start, end) : []),
            ...environmentQuery(ENVIRONMENT_NOT_DEFINED.value),
          ],
        },
      },
      aggs: {
        services: {
          terms: {
            field: SERVICE_NAME,
            size: 1,
          },
        },
      },
    },
  };

  const response = await apmEventClient.search(
    'has_not_defined_environment',
    params
  );

  const buckets = response.aggregations?.services.buckets ?? [];

  return {
    hasNotDefinedEnvironment: buckets.length > 0,
  };
}
