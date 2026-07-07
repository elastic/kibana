/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { History } from 'history';
import { parse, stringify } from 'query-string';
import { url } from '@kbn/kibana-utils-plugin/public';

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

function getNextLocation(history: History, locationWithQuery: LocationWithQuery) {
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

export function isInactiveHistoryError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('fell out of navigation scope');
}

export function replace(history: History, locationWithQuery: LocationWithQuery) {
  const location = getNextLocation(history, locationWithQuery);
  try {
    return history.replace(location);
  } catch (error) {
    if (isInactiveHistoryError(error)) return;
    throw error;
  }
}

export function push(history: History, locationWithQuery: LocationWithQuery) {
  const location = getNextLocation(history, locationWithQuery);
  try {
    return history.push(location);
  } catch (error) {
    if (isInactiveHistoryError(error)) return;
    throw error;
  }
}

export function createHref(history: History, locationWithQuery: LocationWithQuery) {
  const location = getNextLocation(history, locationWithQuery);
  try {
    return history.createHref(location);
  } catch (error) {
    if (isInactiveHistoryError(error)) return '';
    throw error;
  }
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
  pageSize?: string | number;
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
  offset?: string;
  transactionResult?: string;
  host?: string;
  containerId?: string;
  podName?: string;
  agentName?: string;
  serviceVersion?: string;
  serviceGroup?: string;

  // Logs tab state (for persisting saved search customizations)
  logsColumns?: string;
  logsSort?: string;
  logsGrid?: string;
  logsRowHeight?: number;
  logsRowsPerPage?: number;
  logsDensity?: string;
}

// forces every value of T[K] to be type: string
type StringifyAll<T> = { [K in keyof T]: string };
type APMQueryParamsRaw = StringifyAll<APMQueryParams>;
