/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify } from 'query-string';
import { UptimeUrlParams } from './url_params';
import { CLIENT_DEFAULTS } from '../../../common/constants';

const {
  AUTOREFRESH_INTERVAL,
  AUTOREFRESH_IS_PAUSED,
  DATE_RANGE_START,
  DATE_RANGE_END,
  FOCUS_CONNECTOR_FIELD,
} = CLIENT_DEFAULTS;

export const stringifyUrlParams = (params: Partial<UptimeUrlParams>, ignoreEmpty = false) => {
  if (ignoreEmpty) {
    // We don't want to encode this values because they are often set to Date.now(), the relative
    // values in dateRangeStart are better for a URL.
    delete params.absoluteDateRangeStart;
    delete params.absoluteDateRangeEnd;

    Object.keys(params).forEach((key: string) => {
      // @ts-ignore
      const val = params[key];
      if (val == null || val === '') {
        // @ts-ignore
        delete params[key];
      }
      if (key === 'dateRangeStart' && val === DATE_RANGE_START) {
        delete params[key];
      }
      if (key === 'dateRangeEnd' && val === DATE_RANGE_END) {
        delete params[key];
      }
      if (key === 'autorefreshIsPaused' && val === AUTOREFRESH_IS_PAUSED) {
        delete params[key];
      }
      if (key === 'autorefreshInterval' && val === AUTOREFRESH_INTERVAL) {
        delete params[key];
      }
      if (key === 'focusConnectorField' && val === FOCUS_CONNECTOR_FIELD) {
        delete params[key];
      }
    });
  }
  return `?${stringify(params, { sort: false })}`;
};
