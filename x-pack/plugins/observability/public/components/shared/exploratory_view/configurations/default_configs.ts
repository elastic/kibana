/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewType } from '../types';
import { getPageLoadDistLensConfig } from './page_load_dist_config';
import { getPageViewLensConfig } from './page_view_config';
import { getMonitorDurationConfig } from './monitor_duration_config';
import { getServiceLatencyLensConfig } from './service_latency_config';

export const getDefaultConfigs = ({ dataViewType }: { dataViewType: DataViewType }) => {
  switch (dataViewType) {
    case 'page-load-dist':
      return getPageLoadDistLensConfig({});
    case 'page-views':
      return getPageViewLensConfig();
    case 'uptime-duration':
      return getMonitorDurationConfig();
    case 'service-latency':
      return getServiceLatencyLensConfig();
    default:
      return getPageViewLensConfig();
  }
};
