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
import { StringMap } from '../../../../typings/common';
import { TIMEPICKER_DEFAULTS } from '../../../store/urlParams';
import { KibanaHrefArgs, PERSISTENT_APM_PARAMS, toQuery } from './url_helpers';

interface RisonEncoded {
  _g?: string;
  _a?: string;
}

function createG(query: StringMap<any>) {
  const g = { ...query._g };

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
}: KibanaHrefArgs) {
  const currentQuery = toQuery(location.search);
  const nextQuery = {
    ...TIMEPICKER_DEFAULTS,
    ...pick(currentQuery, PERSISTENT_APM_PARAMS),
    ...query
  };

  const g = createG(nextQuery);
  const encodedG = rison.encode(g);
  const encodedA = query._a ? rison.encode(query._a) : '';

  const risonQuery: RisonEncoded = { _g: encodedG };

  if (encodedA) {
    risonQuery._a = encodedA;
  }

  // don't URI-encode the already-encoded rison
  const search = qs.stringify(
    { ...query, ...risonQuery },
    undefined,
    undefined,
    {
      encodeURIComponent: (v: string) => v
    }
  );

  const href = url.format({
    pathname: chrome.addBasePath(pathname),
    hash: `${hash}?${search}`
  });

  return href;
}
