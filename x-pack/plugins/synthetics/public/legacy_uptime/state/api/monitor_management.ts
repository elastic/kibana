/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_URLS } from '../../../../common/constants';
import {
  FetchMonitorManagementListQueryArgs,
  MonitorManagementListResultCodec,
  MonitorManagementListResult,
  MonitorManagementEnablementResultCodec,
  MonitorManagementEnablementResult,
  ServiceLocations,
  SyntheticsMonitor,
  EncryptedSyntheticsMonitor,
  ServiceLocationsApiResponseCodec,
  ServiceLocationErrors,
  ThrottlingOptions,
  Locations,
  SyntheticsMonitorSchedule,
} from '../../../../common/runtime_types';
import {
  DecryptedSyntheticsMonitorSavedObject,
  SyntheticsServiceAllowed,
} from '../../../../common/types';
import { apiService } from './utils';

export const setMonitor = async ({
  monitor,
  id,
}: {
  monitor: SyntheticsMonitor | EncryptedSyntheticsMonitor;
  id?: string;
}): Promise<{ attributes: { errors: ServiceLocationErrors } } | SyntheticsMonitor> => {
  if (id) {
    return await apiService.put(`${API_URLS.SYNTHETICS_MONITORS}/${id}`, monitor);
  } else {
    return await apiService.post(API_URLS.SYNTHETICS_MONITORS, monitor, undefined, {
      preserve_namespace: true,
    });
  }
};

export const getMonitor = async ({
  id,
}: {
  id: string;
}): Promise<DecryptedSyntheticsMonitorSavedObject> => {
  return await apiService.get(`${API_URLS.SYNTHETICS_MONITORS}/${id}`);
};

export const deleteMonitor = async ({ id }: { id: string }): Promise<void> => {
  return await apiService.delete(`${API_URLS.SYNTHETICS_MONITORS}/${id}`);
};

export const fetchMonitorManagementList = async (
  params: FetchMonitorManagementListQueryArgs
): Promise<MonitorManagementListResult> => {
  return await apiService.get(
    API_URLS.SYNTHETICS_MONITORS,
    params,
    MonitorManagementListResultCodec
  );
};

export const fetchServiceLocations = async (): Promise<{
  throttling: ThrottlingOptions | undefined;
  locations: ServiceLocations;
}> => {
  const { throttling, locations } = await apiService.get(
    API_URLS.SERVICE_LOCATIONS,
    undefined,
    ServiceLocationsApiResponseCodec
  );
  return { throttling, locations };
};

export const runOnceMonitor = async ({
  monitor,
  id,
}: {
  monitor: SyntheticsMonitor;
  id: string;
}): Promise<{ errors: Array<{ error: Error }> }> => {
  return await apiService.post(API_URLS.RUN_ONCE_MONITOR + `/${id}`, monitor);
};

export interface TestNowResponse {
  schedule: SyntheticsMonitorSchedule;
  locations: Locations;
  errors?: ServiceLocationErrors;
  testRunId: string;
  monitorId: string;
}

export const triggerTestNowMonitor = async (
  configId: string
): Promise<TestNowResponse | undefined> => {
  return await apiService.get(API_URLS.TRIGGER_MONITOR + `/${configId}`);
};

export const fetchGetSyntheticsEnablement =
  async (): Promise<MonitorManagementEnablementResult> => {
    return await apiService.get(
      API_URLS.SYNTHETICS_ENABLEMENT,
      undefined,
      MonitorManagementEnablementResultCodec
    );
  };

export const fetchDisableSynthetics = async (): Promise<void> => {
  return await apiService.delete(API_URLS.SYNTHETICS_ENABLEMENT);
};

export const fetchEnableSynthetics = async (): Promise<void> => {
  return await apiService.post(API_URLS.SYNTHETICS_ENABLEMENT);
};

export const fetchServiceAllowed = async (): Promise<SyntheticsServiceAllowed> => {
  return await apiService.get(API_URLS.SERVICE_ALLOWED);
};

export const fetchServiceAPIKey = async (): Promise<{
  apiKey: { encoded: string };
}> => {
  return await apiService.get(API_URLS.SYNTHETICS_APIKEY);
};
