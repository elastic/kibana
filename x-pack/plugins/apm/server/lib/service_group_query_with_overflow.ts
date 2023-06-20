/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { kqlQuery } from '@kbn/observability-plugin/server';
import { SERVICE_NAME } from '@kbn/ux-plugin/common/elasticsearch_fieldnames';
import { ServiceGroup } from '../../common/service_groups';

export function serviceGroupWithOverflowQuery(
  serviceGroup?: ServiceGroup | null
): QueryDslQueryContainer[] {
  if (serviceGroup) {
    const serviceGroupQuery = kqlQuery(serviceGroup?.kuery);
    const otherBucketQuery = kqlQuery(`${SERVICE_NAME} : "_other"`);

    return [
      {
        bool: {
          should: [...serviceGroupQuery, ...otherBucketQuery],
        },
      },
    ];
  }
  return [];
}
