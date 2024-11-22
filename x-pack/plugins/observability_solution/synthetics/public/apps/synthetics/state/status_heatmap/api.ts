/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYNTHETICS_API_URLS } from '../../../../../common/constants';
import { MonitorStatusHeatmapBucket } from '../../../../../common/runtime_types';
import { apiService } from '../../../../utils/api_service';

export const fetchMonitorStatusHeatmap = async ({
  monitorId,
  location,
  from,
  to,
  interval,
}: {
  monitorId: string;
  location: string;
  from: string | number;
  to: string | number;
  interval: number;
}): Promise<MonitorStatusHeatmapBucket[]> => {
  const response = await apiService.get<{
    result: MonitorStatusHeatmapBucket[];
  }>(SYNTHETICS_API_URLS.MONITOR_STATUS_HEATMAP, {
    monitorId,
    location,
    from,
    to,
    interval,
  });
  return response.result;
};
