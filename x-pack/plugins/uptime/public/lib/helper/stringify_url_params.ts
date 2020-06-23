/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { stringify } from 'query-string';
import { UptimeUrlParams } from './url_params';
import { CLIENT_DEFAULTS } from '../../../common/constants';

const {
  AUTOREFRESH_INTERVAL,
  AUTOREFRESH_IS_PAUSED,
  DATE_RANGE_START,
  DATE_RANGE_END,
} = CLIENT_DEFAULTS;

export const stringifyUrlParams = (params: Partial<UptimeUrlParams>, ignoreEmpty = false) => {
  if (ignoreEmpty) {
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
    });
  }
  return `?${stringify(params, { sort: false })}`;
};
