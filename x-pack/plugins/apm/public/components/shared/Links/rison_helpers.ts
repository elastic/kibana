/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import { pick, set } from 'lodash';
import rison from 'rison-node';
import { StringMap } from '../../../../typings/common';
import { TIMEPICKER_DEFAULTS } from '../../../store/urlParams';
import { APMQueryParams, PERSISTENT_APM_PARAMS, toQuery } from './url_helpers';

export interface RisonDecoded {
  _g?: StringMap<any>;
  _a?: StringMap<any>;
}

type RisonAPMQueryParams = APMQueryParams & RisonDecoded;

function createG(query: RisonAPMQueryParams) {
  const g: RisonDecoded['_g'] = { ...query._g };

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

export function getRisonString(
  currentSearch: Location['search'],
  query: RisonDecoded = {}
) {
  const currentQuery = toQuery(currentSearch);
  const nextQuery = {
    ...TIMEPICKER_DEFAULTS,
    ...pick(currentQuery, PERSISTENT_APM_PARAMS),
    ...query
  };

  const g = createG(nextQuery);
  const encodedG = rison.encode(g);
  const encodedA = query._a ? rison.encode(query._a) : '';
  const risonValues = [];

  if (encodedG) {
    risonValues.push(`_g=${encodedG}`);
  }

  if (encodedA) {
    risonValues.push(`_a=${encodedA}`);
  }

  return risonValues.join('&');
}
