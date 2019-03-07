/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import createHistory from 'history/createHashHistory';
import { mapValues, pick } from 'lodash';
import qs from 'querystring';
import chrome from 'ui/chrome';
import url from 'url';

export function toQuery(search?: string): APMQueryParamsRaw {
  return search ? qs.parse(search.slice(1)) : {};
}

export function fromQuery(query: APMQueryParams) {
  // we have to avoid encoding range params because they cause
  // Kibana angular to decode them and append them to the existing
  // URL as an encoded hash /shrug
  const encoded = mapValues(query, (value, key) => {
    if (['rangeFrom', 'rangeTo'].includes(key!)) {
      return value;
    }
    return qs.escape(value.toString());
  });

  return qs.stringify(encoded, '&', '=', {
    encodeURIComponent: (value: string) => value
  });
}

export const PERSISTENT_APM_PARAMS = [
  'kuery',
  'rangeFrom',
  'rangeTo',
  'refreshPaused',
  'refreshInterval'
];

function getSearchString(
  location: Location,
  pathname: string,
  query: APMQueryParams = {}
) {
  const currentQuery = toQuery(location.search);

  // Preserve existing params for apm links
  const isApmLink = pathname.includes('app/apm') || pathname === '';
  if (isApmLink) {
    const nextQuery = {
      ...pick(currentQuery, PERSISTENT_APM_PARAMS),
      ...query
    };
    return fromQuery(nextQuery);
  }

  return fromQuery(query);
}

export interface KibanaHrefArgs<T = APMQueryParams> {
  location: Location;
  pathname?: string;
  hash?: string;
  query?: T;
}

// TODO: Will eventually need to solve for the case when we need to use this helper to link to
// another Kibana app which requires url query params not covered by APMQueryParams
export function getKibanaHref({
  location,
  pathname = '',
  hash,
  query = {}
}: KibanaHrefArgs): string {
  const search = getSearchString(location, pathname, query);
  const href = url.format({
    pathname: chrome.addBasePath(pathname),
    hash: `${hash}?${search}`
  });
  return href;
}

export interface APMQueryParams {
  transactionId?: string;
  traceId?: string;
  detailTab?: string;
  flyoutDetailTab?: string;
  waterfallItemId?: string;
  spanId?: string;
  page?: string | number;
  sortDirection?: string;
  sortField?: string;
  kuery?: string;
  rangeFrom?: string;
  rangeTo?: string;
  refreshPaused?: string | boolean;
  refreshInterval?: string | number;
}

// forces every value of T[K] to be type: string
type StringifyAll<T> = { [K in keyof T]: string };
type APMQueryParamsRaw = StringifyAll<APMQueryParams>;

// This is downright horrible 😭 💔
// Angular decodes encoded url tokens like "%2F" to "/" which causes the route to change.
// It was supposedly fixed in https://github.com/angular/angular.js/commit/1b779028fdd339febaa1fff5f3bd4cfcda46cc09 but still seeing the issue
export function legacyEncodeURIComponent(rawUrl?: string) {
  return rawUrl && encodeURIComponent(rawUrl).replace(/%/g, '~');
}

export function legacyDecodeURIComponent(encodedUrl?: string) {
  return encodedUrl && decodeURIComponent(encodedUrl.replace(/~/g, '%'));
}

// Make history singleton available across APM project.
// This is not great. Other options are to use context or withRouter helper
// React Context API is unstable and will change soon-ish (probably 16.3)
// withRouter helper from react-router overrides several props (eg. `location`) which makes it less desireable
export const history = createHistory();
