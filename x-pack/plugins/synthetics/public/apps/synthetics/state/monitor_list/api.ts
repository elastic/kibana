/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core-saved-objects-common';
import { UpsertMonitorRequest } from '..';
import { API_URLS } from '../../../../../common/constants';
import {
  EncryptedSyntheticsMonitor,
  FetchMonitorManagementListQueryArgs,
  MonitorManagementListResult,
  MonitorManagementListResultCodec,
  ServiceLocationErrors,
  SyntheticsMonitor,
} from '../../../../../common/runtime_types';
import { apiService } from '../../../../utils/api_service';

import { MonitorListPageState } from './models';

function toMonitorManagementListQueryArgs(
  pageState: MonitorListPageState
): FetchMonitorManagementListQueryArgs {
  return {
    perPage: pageState.pageSize,
    page: pageState.pageIndex + 1,
    sortOrder: pageState.sortOrder,
    sortField: pageState.sortField,
    query: pageState.query,
    tags: pageState.tags,
    locations: pageState.locations,
    monitorTypes: pageState.monitorTypes,
    projects: pageState.projects,
    schedules: pageState.schedules,
    searchFields: [],
  };
}

export const fetchMonitorManagementList = async (
  pageState: MonitorListPageState
): Promise<MonitorManagementListResult> => {
  const params = toMonitorManagementListQueryArgs(pageState);

  return await apiService.get(
    API_URLS.SYNTHETICS_MONITORS,
    params,
    MonitorManagementListResultCodec
  );
};

export const fetchDeleteMonitor = async ({ configId }: { configId: string }): Promise<void> => {
  return await apiService.delete(`${API_URLS.SYNTHETICS_MONITORS}/${configId}`);
};

export type UpsertMonitorResponse =
  | { attributes: { errors: ServiceLocationErrors }; id: string }
  | SavedObject<SyntheticsMonitor>;

export const fetchUpsertMonitor = async ({
  monitor,
  configId,
}: UpsertMonitorRequest): Promise<UpsertMonitorResponse> => {
  if (configId) {
    return await apiService.put(`${API_URLS.SYNTHETICS_MONITORS}/${configId}`, monitor);
  } else {
    return await apiService.post(API_URLS.SYNTHETICS_MONITORS, monitor);
  }
};

export const fetchCreateMonitor = async ({
  monitor,
}: {
  monitor: SyntheticsMonitor | EncryptedSyntheticsMonitor;
}): Promise<{ attributes: { errors: ServiceLocationErrors } } | SyntheticsMonitor> => {
  return await apiService.post(API_URLS.SYNTHETICS_MONITORS, monitor);
};
