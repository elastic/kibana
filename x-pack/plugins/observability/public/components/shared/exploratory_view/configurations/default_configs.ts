/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReportViewTypes } from '../types';
import { getPageLoadDistLensConfig } from './page_load_dist_config';
import { getPageViewLensConfig } from './page_view_config';
import { getMonitorDurationConfig } from './monitor_duration_config';
import { getServiceLatencyLensConfig } from './service_latency_config';
import { getMonitorPingsConfig } from './monitor_pings_config';
import { getServiceThroughputLensConfig } from './service_throughput_config';

interface Props {
  reportType: keyof typeof ReportViewTypes;
  seriesId: string;
  serviceName: string;
}

export const getDefaultConfigs = ({ reportType, seriesId, serviceName }: Props) => {
  switch (ReportViewTypes[reportType]) {
    case 'page-load-dist':
      return getPageLoadDistLensConfig({ seriesId, serviceName });
    case 'page-views':
      return getPageViewLensConfig({ seriesId, serviceName });
    case 'uptime-duration':
      return getMonitorDurationConfig();
    case 'uptime-pings':
      return getMonitorPingsConfig({ seriesId });
    case 'service-latency':
      return getServiceLatencyLensConfig({ seriesId, serviceName });
    case 'service-throughput':
      return getServiceThroughputLensConfig({ seriesId, serviceName });
    default:
      return getPageViewLensConfig({ seriesId, serviceName });
  }
};
