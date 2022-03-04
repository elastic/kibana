/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { History } from 'history';
import { parse, stringify } from 'query-string';
import { url } from '../../../../../../../src/plugins/kibana_utils/public';

export function toQuery(search?: string): APMQueryParamsRaw {
  return search ? parse(search.slice(1), { sort: false }) : {};
}

export function fromQuery(query: Record<string, any>) {
  const encodedQuery = url.encodeQuery(query, (value) =>
    encodeURIComponent(value).replace(/%3A/g, ':')
  );

  return stringify(encodedQuery, { sort: false, encode: false });
}

type LocationWithQuery = Partial<
  History['location'] & {
    query: Record<string, string>;
  }
>;

function getNextLocation(
  history: History,
  locationWithQuery: LocationWithQuery
) {
  const { query, ...rest } = locationWithQuery;
  return {
    ...history.location,
    ...rest,
    search: fromQuery({
      ...toQuery(history.location.search),
      ...query,
    }),
  };
}

export function replace(
  history: History,
  locationWithQuery: LocationWithQuery
) {
  const location = getNextLocation(history, locationWithQuery);
  return history.replace(location);
}

export function push(history: History, locationWithQuery: LocationWithQuery) {
  const location = getNextLocation(history, locationWithQuery);
  return history.push(location);
}

export function createHref(
  history: History,
  locationWithQuery: LocationWithQuery
) {
  const location = getNextLocation(history, locationWithQuery);
  return history.createHref(location);
}

export interface APMQueryParams {
  sampleRangeFrom?: number;
  sampleRangeTo?: number;
  transactionId?: string;
  transactionName?: string;
  transactionType?: string;
  traceId?: string;
  detailTab?: string;
  flyoutDetailTab?: string;
  waterfallItemId?: string;
  spanId?: string;
  page?: string | number;
  pageSize?: string;
  sortDirection?: string;
  sortField?: string;
  kuery?: string;
  environment?: string;
  rangeFrom?: string;
  rangeTo?: string;
  refreshPaused?: string | boolean;
  refreshInterval?: string | number;
  searchTerm?: string;
  percentile?: 50 | 75 | 90 | 95 | 99;
  latencyAggregationType?: string;
  comparisonEnabled?: boolean;
  comparisonType?: string;
  transactionResult?: string;
  host?: string;
  containerId?: string;
  podName?: string;
  agentName?: string;
  serviceVersion?: string;
  serviceGroup?: string;
}

// forces every value of T[K] to be type: string
type StringifyAll<T> = { [K in keyof T]: string };
type APMQueryParamsRaw = StringifyAll<APMQueryParams>;
