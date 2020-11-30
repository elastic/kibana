/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AggregationOptionsByType,
  AggregationInputMap,
  ESSearchBody,
} from '../../../../typings/elasticsearch';
import { APMEventESSearchRequest } from '../lib/helpers/create_es_client/create_apm_event_client';

export type Projection = Omit<APMEventESSearchRequest, 'body'> & {
  body: Omit<ESSearchBody, 'aggs'> & {
    aggs?: {
      [key: string]: {
        terms: AggregationOptionsByType['terms'] & { field: string };
        aggs?: AggregationInputMap;
      };
    };
  };
};
