/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SERVICE_NAME,
  ERROR_GROUP_ID,
} from '../../common/elasticsearch_fieldnames';
import { rangeQuery, kqlQuery } from '../../../observability/server';
import { environmentQuery } from '../../common/utils/environment_query';
import { ProcessorEvent } from '../../common/processor_event';

export function getErrorGroupsProjection({
  environment,
  kuery,
  serviceName,
  start,
  end,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  start: number;
  end: number;
}) {
  return {
    apm: {
      events: [ProcessorEvent.error as const],
    },
    body: {
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
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
          },
        },
      },
    },
  };
}
