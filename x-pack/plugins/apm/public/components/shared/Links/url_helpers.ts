/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse, stringify } from 'query-string';
import { url } from '../../../../../../../src/plugins/kibana_utils/public';
import { LocalUIFilterName } from '../../../../common/ui_filter';

export function toQuery(search?: string): APMQueryParamsRaw {
  return search ? parse(search.slice(1), { sort: false }) : {};
}

export function fromQuery(query: Record<string, any>) {
  const encodedQuery = url.encodeQuery(query, (value) =>
    encodeURIComponent(value).replace(/%3A/g, ':')
  );

  return stringify(encodedQuery, { sort: false, encode: false });
}

export type APMQueryParams = {
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
} & { [key in LocalUIFilterName]?: string };

// forces every value of T[K] to be type: string
type StringifyAll<T> = { [K in keyof T]: string };
type APMQueryParamsRaw = StringifyAll<APMQueryParams>;
