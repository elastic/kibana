/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import { TIMEPICKER_DEFAULTS } from '../../../context/UrlParamsContext/constants';
import { toQuery } from './url_helpers';

export interface TimepickerRisonData {
  time?: {
    from?: string;
    to?: string;
  };
  refreshInterval?: {
    pause?: boolean | string;
    value?: number | string;
  };
}

export function getTimepickerRisonData(currentSearch: Location['search']) {
  const currentQuery = toQuery(currentSearch);
  const nextQuery = {
    ...TIMEPICKER_DEFAULTS,
    ...currentQuery
  };
  return {
    time: {
      from: encodeURIComponent(nextQuery.rangeFrom),
      to: encodeURIComponent(nextQuery.rangeTo)
    },
    refreshInterval: {
      pause: String(nextQuery.refreshPaused),
      value: String(nextQuery.refreshInterval)
    }
  };
}
