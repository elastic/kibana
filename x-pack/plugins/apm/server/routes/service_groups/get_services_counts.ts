/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery, kqlQuery } from '@kbn/observability-plugin/server';
import { Setup } from '../../lib/helpers/setup_request';
import { SERVICE_NAME } from '../../../common/elasticsearch_fieldnames';

export async function getServicesCounts({
  setup,
  kuery,
  maxNumberOfServices,
  start,
  end,
}: {
  setup: Setup;
  kuery: string;
  maxNumberOfServices: number;
  start: number;
  end: number;
}) {
  const { apmEventClient } = setup;

  const response = await apmEventClient.search('get_services_count', {
    apm: {
      events: [
        ProcessorEvent.metric,
        ProcessorEvent.transaction,
        ProcessorEvent.span,
        ProcessorEvent.error,
      ],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [...rangeQuery(start, end), ...kqlQuery(kuery)],
        },
      },
      aggs: {
        services_count: {
          cardinality: {
            field: SERVICE_NAME,
          },
        },
      },
    },
  });

  return response?.aggregations?.services_count.value ?? 0;
}
