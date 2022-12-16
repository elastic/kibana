/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
    monitorType: pageState.monitorType,
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

export const fetchDeleteMonitor = async ({ id }: { id: string }): Promise<void> => {
  return await apiService.delete(`${API_URLS.SYNTHETICS_MONITORS}/${id}`);
};

export const fetchUpsertMonitor = async ({
  monitor,
  id,
}: {
  monitor: Partial<SyntheticsMonitor> | Partial<EncryptedSyntheticsMonitor>;
  id?: string;
}): Promise<{ attributes: { errors: ServiceLocationErrors } } | SyntheticsMonitor> => {
  if (id) {
    return await apiService.put(`${API_URLS.SYNTHETICS_MONITORS}/${id}`, monitor);
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
