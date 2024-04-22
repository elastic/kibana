/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
      from: currentQuery.rangeFrom || '',
      to: currentQuery.rangeTo || '',
    },
    refreshInterval: {
      pause: currentQuery.refreshPaused
        ? Boolean(currentQuery.refreshPaused)
        : true,
      value: currentQuery.refreshInterval
        ? parseInt(currentQuery.refreshInterval, 10)
        : 0,
    },
  };
}
