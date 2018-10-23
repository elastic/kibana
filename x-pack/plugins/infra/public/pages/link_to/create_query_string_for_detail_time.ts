/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Location } from 'history';
import { replaceStateKeyInQueryString } from '../../utils/url_state';
import { getFromFromLocation, getToFromLocation } from './query_params';

export const createQueryStringForDetailTime = (location: Location) => {
  const to = getToFromLocation(location);
  const from = getFromFromLocation(location);
  return to && from
    ? '?' + replaceStateKeyInQueryString('metricTime', { to, from, interval: '>=1m' })('')
    : '';
};
