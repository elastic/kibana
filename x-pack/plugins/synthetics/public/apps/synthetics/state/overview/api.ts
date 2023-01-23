/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core/types';
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
import { SyntheticsMonitor } from '../../../../../common/runtime_types';
import { API_URLS } from '../../../../../common/constants';

export const fetchSyntheticsMonitor = async (
  monitorId: string
): Promise<SavedObject<SyntheticsMonitor>> => {
  return apiService.get(`${API_URLS.SYNTHETICS_MONITORS}/${monitorId}`);
};

function toMonitorOverviewQueryArgs(
  pageState: MonitorOverviewPageState
): FetchMonitorOverviewQueryArgs {
  return {
    query: pageState.query,
    tags: pageState.tags,
    locations: pageState.locations,
    monitorType: pageState.monitorType,
    sortField: pageState.sortField,
    sortOrder: pageState.sortOrder,
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
  const params = toMonitorOverviewQueryArgs(pageState);
  return apiService.get(SYNTHETICS_API_URLS.OVERVIEW_STATUS, params, OverviewStatusCodec);
};
