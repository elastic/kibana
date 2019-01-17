/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import createHistory from 'history/createHashHistory';
import { isPlainObject, mapValues } from 'lodash';
import qs from 'querystring';
import rison from 'rison-node';
import chrome from 'ui/chrome';
import url from 'url';
import { StringMap } from 'x-pack/plugins/apm/typings/common';

export function toQuery(search?: string): QueryParams {
  return search ? qs.parse(search.slice(1)) : {};
}

export function fromQuery(query: QueryParams) {
  const encodedQuery = encodeQuery(query, ['_g', '_a']);
  return stringifyWithoutEncoding(encodedQuery);
}

export function encodeQuery(query: QueryParams, exclude: string[] = []) {
  return mapValues(query, (value, key) => {
    if (exclude.includes(key as string)) {
      return encodeURI(value);
    }
    return qs.escape(value);
  });
}

function stringifyWithoutEncoding(query: QueryParams) {
  return qs.stringify(query, undefined, undefined, {
    encodeURIComponent: (v: string) => v
  });
}

function risonSafeDecode(value?: string) {
  if (!value) {
    return {};
  }

  try {
    const decoded = rison.decode(value);
    return isPlainObject(decoded) ? (decoded as StringMap) : {};
  } catch (e) {
    return {};
  }
}

// Kibana default set in: https://github.com/elastic/kibana/blob/e13e47fc4eb6112f2a5401408e9f765eae90f55d/x-pack/plugins/apm/public/utils/timepicker/index.js#L31-L35
// TODO: store this in config or a shared constant?
const DEFAULT_KIBANA_TIME_RANGE = {
  time: {
    from: 'now-24h',
    mode: 'quick',
    to: 'now'
  }
};

function getQueryWithRisonParams(location: Location, query: RisonDecoded = {}) {
  // Preserve current _g and _a
  const currentQuery = toQuery(location.search);
  const decodedG = risonSafeDecode(currentQuery._g);
  const combinedG = { ...DEFAULT_KIBANA_TIME_RANGE, ...decodedG, ...query._g };
  const encodedG = rison.encode(combinedG);
  const encodedA = query._a ? rison.encode(query._a) : '';

  return {
    ...query,
    _g: encodedG,
    _a: encodedA
  };
}

export interface KibanaHrefArgs {
  location: Location;
  pathname?: string;
  hash?: string;
  query?: QueryParamsDecoded;
}

export function getKibanaHref({
  location,
  pathname = '',
  hash,
  query = {}
}: KibanaHrefArgs): string {
  const queryWithRisonParams = getQueryWithRisonParams(location, query);
  const search = stringifyWithoutEncoding(queryWithRisonParams);
  const href = url.format({
    pathname: chrome.addBasePath(pathname),
    hash: `${hash}?${search}`
  });
  return href;
}

interface APMQueryParams {
  transactionId?: string;
  traceId?: string;
  detailTab?: string;
  flyoutDetailTab?: string;
  waterfallItemId?: string;
  spanId?: string;
  page?: string;
  sortDirection?: string;
  sortField?: string;
  kuery?: string;
}

interface RisonEncoded {
  _g?: string;
  _a?: string;
}

interface RisonDecoded {
  _g?: StringMap;
  _a?: StringMap;
}

export type QueryParams = APMQueryParams & RisonEncoded;
export type QueryParamsDecoded = APMQueryParams & RisonDecoded;

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
