/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReportViewTypes } from '../types';
import { getPerformanceDistLensConfig } from './rum/performance_dist_config';
import { getMonitorDurationConfig } from './synthetics/monitor_duration_config';
import { getServiceLatencyLensConfig } from './apm/service_latency_config';
import { getMonitorPingsConfig } from './synthetics/monitor_pings_config';
import { getServiceThroughputLensConfig } from './apm/service_throughput_config';
import { getKPITrendsLensConfig } from './rum/kpi_trends_config';
import { getCPUUsageLensConfig } from './metrics/cpu_usage_config';
import { getMemoryUsageLensConfig } from './metrics/memory_usage_config';
import { getNetworkActivityLensConfig } from './metrics/network_activity_config';
import { getLogsFrequencyLensConfig } from './logs/logs_frequency_config';
import { IIndexPattern } from '../../../../../../../../src/plugins/data/common/index_patterns';

interface Props {
  reportType: keyof typeof ReportViewTypes;
  seriesId: string;
  indexPattern: IIndexPattern;
}

export const getDefaultConfigs = ({ reportType, seriesId, indexPattern }: Props) => {
  switch (ReportViewTypes[reportType]) {
    case 'page-load-dist':
      return getPerformanceDistLensConfig({ seriesId, indexPattern });
    case 'kpi-trends':
      return getKPITrendsLensConfig({ seriesId, indexPattern });
    case 'uptime-duration':
      return getMonitorDurationConfig({ seriesId, indexPattern });
    case 'uptime-pings':
      return getMonitorPingsConfig({ seriesId, indexPattern });
    case 'service-latency':
      return getServiceLatencyLensConfig({ seriesId, indexPattern });
    case 'service-throughput':
      return getServiceThroughputLensConfig({ seriesId, indexPattern });
    case 'cpu-usage':
      return getCPUUsageLensConfig({ seriesId });
    case 'memory-usage':
      return getMemoryUsageLensConfig({ seriesId });
    case 'network-activity':
      return getNetworkActivityLensConfig({ seriesId });
    case 'logs-frequency':
      return getLogsFrequencyLensConfig({ seriesId });
    default:
      return getKPITrendsLensConfig({ seriesId, indexPattern });
  }
};
