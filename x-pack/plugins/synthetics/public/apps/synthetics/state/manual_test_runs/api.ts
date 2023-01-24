/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceLocationErrors, SyntheticsMonitor } from '../../../../../common/runtime_types';
import { TestNowResponse } from '../../../../../common/types';
import { apiService } from '../../../../utils/api_service';
import { API_URLS } from '../../../../../common/constants';

export const triggerTestNowMonitor = async (
  configId: string
): Promise<TestNowResponse | undefined> => {
  return await apiService.get(API_URLS.TRIGGER_MONITOR + `/${configId}`);
};

export const runOnceMonitor = async ({
  monitor,
  id,
}: {
  monitor: SyntheticsMonitor;
  id: string;
}): Promise<{ errors: ServiceLocationErrors }> => {
  return await apiService.post(API_URLS.RUN_ONCE_MONITOR + `/${id}`, monitor);
};
