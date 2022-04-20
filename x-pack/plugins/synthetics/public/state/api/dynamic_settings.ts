/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DynamicSettingsType,
  DynamicSettings,
  DynamicSettingsSaveResponse,
  DynamicSettingsSaveType,
} from '../../../common/runtime_types';
import { apiService } from './utils';
import { API_URLS } from '../../../common/constants';

const apiPath = API_URLS.DYNAMIC_SETTINGS;

interface SaveApiRequest {
  settings: DynamicSettings;
}

export const getDynamicSettings = async (): Promise<DynamicSettings> => {
  return await apiService.get(apiPath, undefined, DynamicSettingsType);
};

export const setDynamicSettings = async ({
  settings,
}: SaveApiRequest): Promise<DynamicSettingsSaveResponse> => {
  return await apiService.post(apiPath, settings, DynamicSettingsSaveType);
};
