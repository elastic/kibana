/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESSearchRequest, ESSearchBody } from '../../typings/elasticsearch';
import {
  AggregationOptionsByType,
  AggregationInputMap,
} from '../../typings/elasticsearch/aggregations';

export type Projection = Omit<ESSearchRequest, 'body'> & {
  body: Omit<ESSearchBody, 'aggs'> & {
    aggs?: {
      [key: string]: {
        terms: AggregationOptionsByType['terms'];
        aggs?: AggregationInputMap;
      };
    };
  };
};

export enum PROJECTION {
  SERVICES = 'services',
  TRANSACTION_GROUPS = 'transactionGroups',
  TRACES = 'traces',
  TRANSACTIONS = 'transactions',
  METRICS = 'metrics',
  ERROR_GROUPS = 'errorGroups',
  SERVICE_NODES = 'serviceNodes',
  RUM_OVERVIEW = 'rumOverview',
}
