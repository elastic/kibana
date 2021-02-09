/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESFilter } from '../../../../typings/elasticsearch';
import {
  ENVIRONMENT_NOT_DEFINED,
  ENVIRONMENT_ALL,
} from '../environment_filter_values';
import { SERVICE_ENVIRONMENT } from '../elasticsearch_fieldnames';

type QueryContainer = ESFilter;

export function environmentQuery(environment?: string): QueryContainer[] {
  if (!environment || environment === ENVIRONMENT_ALL.value) {
    return [];
  }

  if (environment === ENVIRONMENT_NOT_DEFINED.value) {
    return [{ bool: { must_not: { exists: { field: SERVICE_ENVIRONMENT } } } }];
  }

  return [{ term: { [SERVICE_ENVIRONMENT]: environment } }];
}

export function rangeQuery(
  start: number,
  end: number,
  field = '@timestamp'
): QueryContainer[] {
  return [
    {
      range: {
        [field]: {
          gte: start,
          lte: end,
          format: 'epoch_millis',
        },
      },
    },
  ];
}
