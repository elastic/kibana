/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESSearchBody } from '../../typings/elasticsearch';
import {
  AggregationOptionsByType,
  AggregationInputMap,
} from '../../typings/elasticsearch/aggregations';
import { APMESSearchRequest } from '../../server/lib/helpers/get_es_client/document_types';

export type Projection = Omit<APMESSearchRequest, 'body'> & {
  body: Omit<ESSearchBody, 'aggs'> & {
    aggs?: {
      [key: string]: {
        terms: AggregationOptionsByType['terms'];
        aggs?: AggregationInputMap;
      };
    };
  };
};
