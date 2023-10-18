/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ActionConnector as RawActionConnector,
  ActionType,
} from '@kbn/triggers-actions-ui-plugin/public';
import { apiService } from '../../../../utils/api_service';
import {
  DynamicSettings,
  DynamicSettingsSaveResponse,
  DynamicSettingsSaveCodec,
  DynamicSettingsCodec,
  LocationMonitorsResponse,
  LocationMonitorsType,
} from '../../../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../../../common/constants';
import { LocationMonitor } from '.';

const apiPath = SYNTHETICS_API_URLS.DYNAMIC_SETTINGS;

interface SaveApiRequest {
  settings: DynamicSettings;
}

export const getDynamicSettings = async (): Promise<DynamicSettings> => {
  return await apiService.get(apiPath, undefined, DynamicSettingsCodec);
};

export const setDynamicSettings = async ({
  settings,
}: SaveApiRequest): Promise<DynamicSettingsSaveResponse> => {
  return await apiService.post(apiPath, settings, DynamicSettingsSaveCodec);
};

export const fetchLocationMonitors = async (): Promise<LocationMonitor[]> => {
  const { payload } = await apiService.get<LocationMonitorsResponse>(
    SYNTHETICS_API_URLS.PRIVATE_LOCATIONS_MONITORS,
    undefined,
    LocationMonitorsType
  );

  return payload;
};

export type ActionConnector = Omit<RawActionConnector, 'secrets'>;

export const fetchConnectors = async (): Promise<ActionConnector[]> => {
  return await apiService.get(SYNTHETICS_API_URLS.GET_ACTIONS_CONNECTORS);
};

export const fetchActionTypes = async (): Promise<ActionType[]> => {
  return await apiService.get(SYNTHETICS_API_URLS.GET_CONNECTOR_TYPES, {
    feature_id: 'uptime',
  });
};

export const syncGlobalParamsAPI = async (): Promise<boolean> => {
  return await apiService.get(SYNTHETICS_API_URLS.SYNC_GLOBAL_PARAMS);
};
