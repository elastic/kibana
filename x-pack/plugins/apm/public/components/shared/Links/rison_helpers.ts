/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick, set } from 'lodash';
import qs from 'querystring';
import rison from 'rison-node';
import chrome from 'ui/chrome';
import url from 'url';
import { TIMEPICKER_DEFAULTS } from 'x-pack/plugins/apm/public/store/urlParams';
import { StringMap } from 'x-pack/plugins/apm/typings/common';
import {
  APMQueryParams,
  KibanaHrefArgs,
  PERSISTENT_APM_PARAMS,
  toQuery
} from './url_helpers';

interface RisonEncoded {
  _g?: string;
  _a?: string;
}

export interface RisonDecoded {
  _g?: StringMap<any>;
  _a?: StringMap<any>;
}

export type RisonAPMQueryParams = APMQueryParams & RisonDecoded;
export type RisonHrefArgs = KibanaHrefArgs<RisonAPMQueryParams>;

function createG(query: RisonAPMQueryParams) {
  const { _g: nextG = {} } = query;
  const g: RisonDecoded['_g'] = { ...nextG };

  if (typeof query.rangeFrom !== 'undefined') {
    set(g, 'time.from', encodeURIComponent(query.rangeFrom));
  }
  if (typeof query.rangeTo !== 'undefined') {
    set(g, 'time.to', encodeURIComponent(query.rangeTo));
  }

  if (typeof query.refreshPaused !== 'undefined') {
    set(g, 'refreshInterval.pause', String(query.refreshPaused));
  }
  if (typeof query.refreshInterval !== 'undefined') {
    set(g, 'refreshInterval.value', String(query.refreshInterval));
  }

  return g;
}

export function getRisonHref({
  location,
  pathname,
  hash,
  query = {}
}: RisonHrefArgs) {
  const currentQuery = toQuery(location.search);
  const nextQuery = {
    ...TIMEPICKER_DEFAULTS,
    ...pick(currentQuery, PERSISTENT_APM_PARAMS),
    ...query
  };

  // Create _g value for non-apm links
  const g = createG(nextQuery);
  const encodedG = rison.encode(g);
  const encodedA = query._a ? rison.encode(query._a) : ''; // TODO: Do we need to url-encode the _a values before rison encoding _a?
  const risonQuery: RisonEncoded = {
    _g: encodedG
  };

  if (encodedA) {
    risonQuery._a = encodedA;
  }

  // don't URI-encode the already-encoded rison
  const search = qs.stringify(risonQuery, undefined, undefined, {
    encodeURIComponent: (v: string) => v
  });

  const href = url.format({
    pathname: chrome.addBasePath(pathname),
    hash: `${hash}?${search}`
  });

  return href;
}
