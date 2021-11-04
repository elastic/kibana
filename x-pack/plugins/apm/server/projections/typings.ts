/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { AggregationOptionsByType } from '../../../../../src/core/types/elasticsearch';
import { APMEventESSearchRequest } from '../lib/helpers/create_es_client/create_apm_event_client';

export type Projection = Omit<APMEventESSearchRequest, 'body'> & {
  body: Omit<
    Required<APMEventESSearchRequest>['body'],
    'aggs' | 'aggregations'
  > & {
    aggs?: {
      [key: string]: {
        terms: AggregationOptionsByType['terms'] & { field: string };
        aggs?: Record<string, estypes.AggregationsAggregationContainer>;
      };
    };
  };
};
