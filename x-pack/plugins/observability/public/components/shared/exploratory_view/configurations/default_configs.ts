/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReportViewTypes } from '../types';
import { getPageLoadDistLensConfig } from './page_load_dist_config';
import { getMonitorDurationConfig } from './monitor_duration_config';
import { getServiceLatencyLensConfig } from './service_latency_config';
import { getMonitorPingsConfig } from './monitor_pings_config';
import { getServiceThroughputLensConfig } from './service_throughput_config';
import { getKPITrendsLensConfig } from './kpi_trends_config';

interface Props {
  reportType: keyof typeof ReportViewTypes;
  seriesId: string;
}

export const getDefaultConfigs = ({ reportType, seriesId }: Props) => {
  switch (ReportViewTypes[reportType]) {
    case 'page-load-dist':
      return getPageLoadDistLensConfig({ seriesId });
    case 'page-views':
      return getKPITrendsLensConfig({ seriesId });
    case 'uptime-duration':
      return getMonitorDurationConfig();
    case 'uptime-pings':
      return getMonitorPingsConfig({ seriesId });
    case 'service-latency':
      return getServiceLatencyLensConfig({ seriesId });
    case 'service-throughput':
      return getServiceThroughputLensConfig({ seriesId });
    default:
      return getKPITrendsLensConfig({ seriesId });
  }
};
