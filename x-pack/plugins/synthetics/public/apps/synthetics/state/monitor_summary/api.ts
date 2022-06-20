/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiService } from '../../../../utils/api_service';
import { Ping } from '../../../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../../../common/constants';

export interface QueryParams {
  monitorId: string;
  dateStart: string;
  dateEnd: string;
}

export const fetchMonitorStatus = async (params: QueryParams): Promise<Ping> => {
  return await apiService.get(SYNTHETICS_API_URLS.MONITOR_STATUS, { ...params });
};
