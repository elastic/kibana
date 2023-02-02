/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { settingsRoutesService } from '../../services';
import type { PutSettingsResponse, PutSettingsRequest, GetSettingsResponse } from '../../types';

import { sendRequest, useRequest } from './use_request';

export function useGetSettings() {
  return useRequest<GetSettingsResponse>({
    method: 'get',
    path: settingsRoutesService.getInfoPath(),
  });
}

export function sendGetSettings() {
  return sendRequest<GetSettingsResponse>({
    method: 'get',
    path: settingsRoutesService.getInfoPath(),
  });
}

export function sendPutSettings(body: PutSettingsRequest['body']) {
  return sendRequest<PutSettingsResponse>({
    method: 'put',
    path: settingsRoutesService.getUpdatePath(),
    body,
  });
}
