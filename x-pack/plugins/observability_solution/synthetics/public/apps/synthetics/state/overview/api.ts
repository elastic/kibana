/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYNTHETICS_API_URLS } from '../../../../../common/constants';
import {
  MonitorOverviewResult,
  MonitorOverviewResultCodec,
  FetchMonitorOverviewQueryArgs,
  OverviewStatus,
  OverviewStatusCodec,
} from '../../../../../common/runtime_types';
import { apiService } from '../../../../utils/api_service';
import { MonitorOverviewPageState } from './models';

function toMonitorOverviewQueryArgs(
  pageState: MonitorOverviewPageState
): FetchMonitorOverviewQueryArgs {
  return {
    sortField: pageState.sortField,
    sortOrder: pageState.sortOrder,
    ...toStatusOverviewQueryArgs(pageState),
  };
}

export function toStatusOverviewQueryArgs(
  pageState: MonitorOverviewPageState
): FetchMonitorOverviewQueryArgs {
  return {
    query: pageState.query,
    tags: pageState.tags,
    locations: pageState.locations,
    projects: pageState.projects,
    schedules: pageState.schedules,
    monitorTypes: pageState.monitorTypes,
    searchFields: [],
  };
}

export const fetchMonitorOverview = async (
  pageState: MonitorOverviewPageState
): Promise<MonitorOverviewResult> => {
  const params = toMonitorOverviewQueryArgs(pageState);
  return apiService.get(
    SYNTHETICS_API_URLS.SYNTHETICS_OVERVIEW,
    params,
    MonitorOverviewResultCodec
  );
};

export const fetchOverviewStatus = async (
  pageState: MonitorOverviewPageState
): Promise<OverviewStatus> => {
  const params = toStatusOverviewQueryArgs(pageState);
  return apiService.get(SYNTHETICS_API_URLS.OVERVIEW_STATUS, params, OverviewStatusCodec);
};
