/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import createHistory from 'history/createHashHistory';
import { pick, set } from 'lodash';
import qs from 'querystring';
import rison from 'rison-node';
import chrome from 'ui/chrome';
import url from 'url';
import { StringMap } from 'x-pack/plugins/apm/typings/common';

export function toQuery(search?: string): APMQueryParamsRaw {
  return search ? qs.parse(search.slice(1)) : {};
}

export function fromQuery(query: APMQueryParams) {
  return qs.stringify(query);
}

function createG(values: APMQueryParams) {
  const g: RisonDecoded['_g'] = {};

  if (typeof values.rangeFrom !== 'undefined') {
    set(g, 'time.from', encodeURIComponent(values.rangeFrom));
  }
  if (typeof values.rangeTo !== 'undefined') {
    set(g, 'time.to', encodeURIComponent(values.rangeTo));
  }

  if (typeof values.refreshPaused !== 'undefined') {
    set(g, 'refreshInterval.pause', String(values.refreshPaused));
  }
  if (typeof values.refreshInterval !== 'undefined') {
    set(g, 'refreshInterval.value', String(values.refreshInterval));
  }

  return g;
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
  { _g, _a, ...query }: APMQueryParams & RisonDecoded = {}
) {
  const currentQuery = toQuery(location.search);
  const nextQuery = {
    ...pick(currentQuery, PERSISTENT_APM_PARAMS),
    ...query
  };

  // Preserve existing params for apm links
  const isApmLink = pathname.includes('app/apm') || pathname === '';
  if (isApmLink) {
    return fromQuery(nextQuery);
  }

  // Create _g value for non-apm links
  const g = createG(nextQuery);
  const encodedG = rison.encode(g);
  const encodedA = _a ? rison.encode(_a) : ''; // TODO: Do we need to url-encode the _a values before rison encoding _a?
  const risonQuery: RisonEncoded = {
    _g: encodedG
  };

  if (encodedA) {
    risonQuery._a = encodedA;
  }

  // don't URI-encode the already-encoded rison
  return qs.stringify(risonQuery, undefined, undefined, {
    encodeURIComponent: (v: string) => v
  });
}

export interface KibanaHrefArgs {
  location: Location;
  pathname?: string;
  hash?: string;
  query?: APMQueryParams & RisonDecoded;
}

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

interface RisonEncoded {
  _g?: string;
  _a?: string;
}

export interface RisonDecoded {
  _g?: StringMap<any>;
  _a?: StringMap<any>;
}

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
