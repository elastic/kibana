/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UpsertMonitorRequest } from '..';
import { UpsertMonitorResponse } from '../monitor_management/api';
import { INITIAL_REST_VERSION, SYNTHETICS_API_URLS } from '../../../../../common/constants';
import {
  EncryptedSyntheticsMonitor,
  FetchMonitorManagementListQueryArgs,
  MonitorManagementListResult,
  SyntheticsMonitor,
  MonitorFiltersResult,
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
    monitorQueryIds: pageState.monitorQueryIds,
    searchFields: [],
  };
}

export const fetchMonitorManagementList = async (
  pageState: MonitorListPageState
): Promise<MonitorManagementListResult> => {
  const params = toMonitorManagementListQueryArgs(pageState);

  return await apiService.get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS, {
    ...params,
    version: INITIAL_REST_VERSION,
  });
};

export const fetchDeleteMonitor = async ({ configIds }: { configIds: string[] }): Promise<void> => {
  return await apiService.delete(
    SYNTHETICS_API_URLS.SYNTHETICS_MONITORS,
    { version: INITIAL_REST_VERSION },
    {
      ids: configIds,
    }
  );
};

export const fetchUpsertMonitor = async ({
  monitor,
  configId,
}: UpsertMonitorRequest): Promise<UpsertMonitorResponse> => {
  if (configId) {
    return await apiService.put(
      `${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}/${configId}`,
      monitor,
      null,
      {
        version: INITIAL_REST_VERSION,
        ui: true,
      }
    );
  } else {
    return await apiService.post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS, monitor, null, {
      version: INITIAL_REST_VERSION,
    });
  }
};

export const createGettingStartedMonitor = async ({
  monitor,
}: {
  monitor: SyntheticsMonitor | EncryptedSyntheticsMonitor;
}): Promise<UpsertMonitorResponse> => {
  return await apiService.post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS, monitor, undefined, {
    gettingStarted: true,
    version: INITIAL_REST_VERSION,
  });
};

export const fetchMonitorFilters = async (): Promise<MonitorFiltersResult> => {
  return await apiService.get(SYNTHETICS_API_URLS.FILTERS);
};
