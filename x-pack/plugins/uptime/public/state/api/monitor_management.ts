/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_URLS } from '../../../common/constants';
import { apiService } from './utils';

// TODO, change to monitor runtime type
export const setMonitor = async ({ monitor, id }: { monitor: any; id?: string }): Promise<void> => {
  if (id) {
    return await apiService.post(`${API_URLS.SYNTHETICS_MONITORS}/${id}`, monitor);
  } else {
    return await apiService.post(API_URLS.SYNTHETICS_MONITORS, monitor);
  }
};
