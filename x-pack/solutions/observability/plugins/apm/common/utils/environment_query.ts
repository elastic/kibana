/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { SERVICE_ENVIRONMENT, SERVICE_NODE_NAME } from '../es_fields/apm';
import { ENVIRONMENT_ALL, ENVIRONMENT_NOT_DEFINED } from '../environment_filter_values';
import { SERVICE_NODE_NAME_MISSING } from '../service_nodes';

export function environmentQuery(
  environment: string | undefined,
  field: string = SERVICE_ENVIRONMENT
): QueryDslQueryContainer[] {
  if (environment === ENVIRONMENT_ALL.value) {
    return [];
  }

  if (!environment || environment === ENVIRONMENT_NOT_DEFINED.value) {
    return [
      {
        bool: {
          should: [
            {
              term: { [field]: ENVIRONMENT_NOT_DEFINED.value },
            },
            {
              bool: {
                must_not: [
                  {
                    exists: { field },
                  },
                ],
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
    ];
  }

  return [{ term: { [field]: environment } }];
}

export function serviceNodeNameQuery(serviceNodeName?: string): QueryDslQueryContainer[] {
  if (!serviceNodeName) {
    return [];
  }

  if (serviceNodeName === SERVICE_NODE_NAME_MISSING) {
    return [{ bool: { must_not: [{ exists: { field: SERVICE_NODE_NAME } }] } }];
  }

  return [{ term: { [SERVICE_NODE_NAME]: serviceNodeName } }];
}
