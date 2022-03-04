/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseParams } from './types';
import { MonitorDetailsType, MonitorLocationsType } from '../../../common/runtime_types';
import { QueryParams } from '../actions/types';
import { apiService } from './utils';
import { API_URLS } from '../../../common/constants';

interface ApiRequest {
  monitorId: string;
}

export type MonitorQueryParams = BaseParams & ApiRequest;

export const fetchMonitorDetails = async ({
  monitorId,
  dateStart,
  dateEnd,
}: MonitorQueryParams) => {
  const params = {
    monitorId,
    dateStart,
    dateEnd,
  };
  return await apiService.get<any>(API_URLS.MONITOR_DETAILS, params, MonitorDetailsType);
};

type ApiParams = QueryParams & ApiRequest;

export const fetchMonitorLocations = async ({ monitorId, dateStart, dateEnd }: ApiParams) => {
  const params = {
    dateStart,
    dateEnd,
    monitorId,
  };
  return await apiService.get<any>(API_URLS.MONITOR_LOCATIONS, params, MonitorLocationsType);
};
