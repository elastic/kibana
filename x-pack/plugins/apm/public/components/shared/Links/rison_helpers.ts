/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
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
  return {
    time: {
      from: currentQuery.rangeFrom
        ? encodeURIComponent(currentQuery.rangeFrom)
        : '',
      to: currentQuery.rangeTo ? encodeURIComponent(currentQuery.rangeTo) : '',
    },
    refreshInterval: {
      pause: currentQuery.refreshPaused
        ? String(currentQuery.refreshPaused)
        : '',
      value: currentQuery.refreshInterval
        ? String(currentQuery.refreshInterval)
        : '',
    },
  };
}
