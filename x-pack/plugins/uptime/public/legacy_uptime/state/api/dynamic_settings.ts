/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DynamicSettingsCodec,
  DynamicSettings,
  DynamicSettingsSaveResponse,
  DynamicSettingsSaveCodec,
} from '../../../../common/runtime_types';
import { apiService } from './utils';
import { API_URLS } from '../../../../common/constants';

interface SaveApiRequest {
  settings: DynamicSettings;
}

export const getDynamicSettings = async (): Promise<DynamicSettings> => {
  return await apiService.get(
    API_URLS.DYNAMIC_SETTINGS,
    { version: '2023-10-31' },
    DynamicSettingsCodec
  );
};

export const setDynamicSettings = async ({
  settings,
}: SaveApiRequest): Promise<DynamicSettingsSaveResponse> => {
  return await apiService.put(API_URLS.DYNAMIC_SETTINGS, settings, DynamicSettingsSaveCodec, {
    version: '2023-10-31',
  });
};
