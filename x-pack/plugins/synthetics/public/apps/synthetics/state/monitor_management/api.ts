/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceLocationsState } from './service_locations';
import { apiService } from '../../../../utils/api_service';
import {
  EncryptedSyntheticsMonitor,
  FetchMonitorManagementListQueryArgs,
  MonitorManagementListResult,
  MonitorManagementListResultCodec,
  ServiceLocationErrors,
  ServiceLocationsApiResponseCodec,
  SyntheticsMonitor,
  SyntheticsMonitorWithId,
} from '../../../../../common/runtime_types';
import { API_URLS } from '../../../../../common/constants';

export const createMonitorAPI = async ({
  monitor,
}: {
  monitor: SyntheticsMonitor | EncryptedSyntheticsMonitor;
}): Promise<{ attributes: { errors: ServiceLocationErrors } } | SyntheticsMonitor> => {
  return await apiService.post(API_URLS.SYNTHETICS_MONITORS, monitor);
};

export const updateMonitorAPI = async ({
  monitor,
  id,
}: {
  monitor: SyntheticsMonitor | EncryptedSyntheticsMonitor;
  id: string;
}): Promise<{ attributes: { errors: ServiceLocationErrors } } | SyntheticsMonitorWithId> => {
  return await apiService.put(`${API_URLS.SYNTHETICS_MONITORS}/${id}`, monitor);
};

export const fetchServiceLocations = async (): Promise<ServiceLocationsState> => {
  const { throttling, locations } = await apiService.get(
    API_URLS.SERVICE_LOCATIONS,
    undefined,
    ServiceLocationsApiResponseCodec
  );
  return { throttling, locations };
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
