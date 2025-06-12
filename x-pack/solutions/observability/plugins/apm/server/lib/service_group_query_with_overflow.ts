/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { kqlQuery, termQuery } from '@kbn/observability-plugin/server';
import { SERVICE_NAME } from '../../common/es_fields/apm';
import type { ServiceGroup } from '../../common/service_groups';

export function serviceGroupWithOverflowQuery(
  serviceGroup?: ServiceGroup | null
): QueryDslQueryContainer[] {
  if (serviceGroup) {
    const serviceGroupQuery = kqlQuery(serviceGroup?.kuery);
    const otherBucketQuery = termQuery(SERVICE_NAME, '_other');

    return [
      {
        bool: {
          should: [
            {
              bool: {
                filter: serviceGroupQuery,
              },
            },
            {
              bool: {
                filter: otherBucketQuery,
              },
            },
          ],
        },
      },
    ];
  }
  return [];
}
