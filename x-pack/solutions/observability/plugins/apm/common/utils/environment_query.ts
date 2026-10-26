/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import {
  RESOURCE_ATTRIBUTES_DEPLOYMENT_ENVIRONMENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NODE_NAME,
} from '../es_fields/apm';
import { ENVIRONMENT_ALL, ENVIRONMENT_NOT_DEFINED } from '../environment_filter_values';
import { SERVICE_NODE_NAME_MISSING } from '../service_nodes';

/**
 * Fields that can carry a service environment. `service.environment` covers ECS/APM data and,
 * via the otel-data alias, OTel documents using the deprecated `deployment.environment`.
 * Documents following OTel semconv >= 1.27 only set `deployment.environment.name`, which the
 * alias does not cover, so it has to be matched explicitly.
 */
export const ENVIRONMENT_FIELDS = [
  SERVICE_ENVIRONMENT,
  RESOURCE_ATTRIBUTES_DEPLOYMENT_ENVIRONMENT_NAME,
] as const;

export function environmentQuery(environment: string | undefined): QueryDslQueryContainer[] {
  if (environment === ENVIRONMENT_ALL.value) {
    return [];
  }

  if (!environment || environment === ENVIRONMENT_NOT_DEFINED.value) {
    return [
      {
        bool: {
          should: [
            {
              term: { [SERVICE_ENVIRONMENT]: ENVIRONMENT_NOT_DEFINED.value },
            },
            {
              bool: {
                must_not: ENVIRONMENT_FIELDS.map((field) => ({ exists: { field } })),
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
    ];
  }

  return [
    {
      bool: {
        should: ENVIRONMENT_FIELDS.map((field) => ({ term: { [field]: environment } })),
        minimum_should_match: 1,
      },
    },
  ];
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
