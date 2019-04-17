/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createHistory from 'history/createHashHistory';
import qs from 'querystring';
import { StringMap } from '../../../../typings/common';

export function toQuery(search?: string): APMQueryParamsRaw {
  return search ? qs.parse(search.slice(1)) : {};
}

export function fromQuery(query: StringMap<any>) {
  return qs.stringify(query);
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
// Angular decodes encoded url tokens like "%2F" to "/" which causes problems when path params contains forward slashes
// This was originally fixed in Angular, but roled back to avoid breaking backwards compatability: https://github.com/angular/angular.js/commit/2bdf7126878c87474bb7588ce093d0a3c57b0026
export function legacyEncodeURIComponent(rawUrl?: string) {
  return (
    rawUrl &&
    encodeURIComponent(rawUrl)
      .replace(/~/g, '%7E')
      .replace(/%/g, '~')
  );
}

export function legacyDecodeURIComponent(encodedUrl?: string) {
  return encodedUrl && decodeURIComponent(encodedUrl.replace(/~/g, '%'));
}

// Make history singleton available across APM project.
// This is not great. Other options are to use context or withRouter helper
// React Context API is unstable and will change soon-ish (probably 16.3)
// withRouter helper from react-router overrides several props (eg. `location`) which makes it less desireable
export const history = createHistory();
