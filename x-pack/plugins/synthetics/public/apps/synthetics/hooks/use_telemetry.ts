/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useGetUrlParams } from './use_url_params';
import { apiService } from '../utils/api_service';
// import { API_URLS } from '../../../common/constants';

export enum SyntheticsPage {
  Overview = 'Overview',
  Monitor = 'Monitor',
  MonitorAdd = 'AddMonitor',
  MonitorEdit = 'EditMonitor',
  MonitorManagement = 'MonitorManagement',
  Settings = 'Settings',
  Certificates = 'Certificates',
  StepDetail = 'StepDetail',
  SyntheticCheckStepsPage = 'SyntheticCheckStepsPage',
  NotFound = '__not-found__',
}

export const useSyntheticsTelemetry = (page?: SyntheticsPage) => {
  const { dateRangeStart, dateRangeEnd, autorefreshInterval, autorefreshIsPaused } =
    useGetUrlParams();

  useEffect(() => {
    if (!apiService.http) throw new Error('Core http services are not defined');

    /*
    TODO: Add/Modify telemetry endpoint for synthetics
    const params = {
      page,
      autorefreshInterval: autorefreshInterval / 1000, // divide by 1000 to keep it in secs
      dateStart: dateRangeStart,
      dateEnd: dateRangeEnd,
      autoRefreshEnabled: !autorefreshIsPaused,
    };*/
    setTimeout(() => {
      // apiService.post(API_URLS.LOG_PAGE_VIEW, params);
    }, 100);
  }, [autorefreshInterval, autorefreshIsPaused, dateRangeEnd, dateRangeStart, page]);
};
