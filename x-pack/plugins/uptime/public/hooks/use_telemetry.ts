/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { useGetUrlParams } from './use_url_params';
import { apiService } from '../state/api/utils';
import { API_URLS } from '../../common/constants';

export enum UptimePage {
  Overview = 'Overview',
  Monitor = 'Monitor',
  Settings = 'Settings',
  Certificates = 'Certificates',
  NotFound = '__not-found__',
}

export const useUptimeTelemetry = (page?: UptimePage) => {
  const {
    dateRangeStart,
    dateRangeEnd,
    autorefreshInterval,
    autorefreshIsPaused,
  } = useGetUrlParams();

  useEffect(() => {
    if (!apiService.http) throw new Error('Core http services are not defined');

    const params = {
      page,
      autorefreshInterval: autorefreshInterval / 1000, // divide by 1000 to keep it in secs
      dateStart: dateRangeStart,
      dateEnd: dateRangeEnd,
      autoRefreshEnabled: !autorefreshIsPaused,
    };
    apiService.post(API_URLS.LOG_PAGE_VIEW, params);
  }, [autorefreshInterval, autorefreshIsPaused, dateRangeEnd, dateRangeStart, page]);
};
