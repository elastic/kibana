/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const BROWSER_FAMILY_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.browserFamily',
  {
    defaultMessage: 'Browser family',
  }
);
export const BROWSER_VERSION_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.browserVersion',
  {
    defaultMessage: 'Browser version',
  }
);

export const OS_LABEL = i18n.translate('xpack.observability.expView.fieldLabels.os', {
  defaultMessage: 'Operating system',
});
export const LOCATION_LABEL = i18n.translate('xpack.observability.expView.fieldLabels.location', {
  defaultMessage: 'Location',
});

export const DEVICE_LABEL = i18n.translate('xpack.observability.expView.fieldLabels.device', {
  defaultMessage: 'Device',
});

export const OBSERVER_LOCATION_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.obsLocation',
  {
    defaultMessage: 'Observer location',
  }
);

export const SERVICE_NAME_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.serviceName',
  {
    defaultMessage: 'Service name',
  }
);

export const ENVIRONMENT_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.environment',
  {
    defaultMessage: 'Environment',
  }
);

export const LCP_LABEL = i18n.translate('xpack.observability.expView.fieldLabels.lcp', {
  defaultMessage: 'Largest contentful paint',
});

export const FCP_LABEL = i18n.translate('xpack.observability.expView.fieldLabels.fcp', {
  defaultMessage: 'First contentful paint',
});

export const TBT_LABEL = i18n.translate('xpack.observability.expView.fieldLabels.tbt', {
  defaultMessage: 'Total blocking time',
});

export const FID_LABEL = i18n.translate('xpack.observability.expView.fieldLabels.fid', {
  defaultMessage: 'First input delay',
});

export const CLS_LABEL = i18n.translate('xpack.observability.expView.fieldLabels.cls', {
  defaultMessage: 'Cumulative layout shift',
});

export const BACKEND_TIME_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.backend',
  {
    defaultMessage: 'Backend time',
  }
);

export const PAGE_LOAD_TIME_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.pageLoadTime',
  {
    defaultMessage: 'Page load time',
  }
);

export const PAGE_VIEWS_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.pageViews',
  {
    defaultMessage: 'Page views',
  }
);

export const PAGES_LOADED_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.pagesLoaded',
  {
    defaultMessage: 'Pages loaded',
  }
);

export const MONITOR_ID_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.monitorId',
  {
    defaultMessage: 'Monitor Id',
  }
);

export const MONITOR_STATUS_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.monitorStatus',
  {
    defaultMessage: 'Monitor Status',
  }
);

export const AGENT_HOST_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.agentHost',
  {
    defaultMessage: 'Agent host',
  }
);

export const HOST_NAME_LABEL = i18n.translate('xpack.observability.expView.fieldLabels.hostName', {
  defaultMessage: 'Host name',
});

export const MONITOR_NAME_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.monitorName',
  {
    defaultMessage: 'Monitor name',
  }
);

export const MONITOR_TYPE_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.monitorType',
  {
    defaultMessage: 'Monitor type',
  }
);

export const PORT_LABEL = i18n.translate('xpack.observability.expView.fieldLabels.port', {
  defaultMessage: 'Port',
});

export const URL_LABEL = i18n.translate('xpack.observability.expView.fieldLabels.url', {
  defaultMessage: 'URL',
});

export const TAGS_LABEL = i18n.translate('xpack.observability.expView.fieldLabels.tags', {
  defaultMessage: 'Tags',
});

export const METRIC_LABEL = i18n.translate('xpack.observability.expView.fieldLabels.metric', {
  defaultMessage: 'Metric',
});
export const KPI_LABEL = i18n.translate('xpack.observability.expView.fieldLabels.kpi', {
  defaultMessage: 'KPI',
});

export const PERF_DIST_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.performanceDistribution',
  {
    defaultMessage: 'Performance Distribution',
  }
);

export const MONITOR_DURATION_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.monitorDuration',
  {
    defaultMessage: 'Uptime monitor duration',
  }
);

export const UPTIME_PINGS_LABEL = i18n.translate('xpack.observability.expView.fieldLabels.pings', {
  defaultMessage: 'Uptime pings',
});

export const SERVICE_LATENCY_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.serviceLatency',
  {
    defaultMessage: 'APM Service latency',
  }
);

export const SERVICE_THROUGHPUT_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.serviceThroughput',
  {
    defaultMessage: 'APM Service throughput',
  }
);

export const CPU_USAGE_LABEL = i18n.translate('xpack.observability.expView.fieldLabels.cpuUsage', {
  defaultMessage: 'System CPU usage',
});

export const NETWORK_ACTIVITY_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.networkActivity',
  {
    defaultMessage: 'Network activity',
  }
);
export const MEMORY_USAGE_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.memoryUsage',
  {
    defaultMessage: 'System memory usage',
  }
);

export const LOGS_FREQUENCY_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.logsFrequency',
  {
    defaultMessage: 'Logs frequency',
  }
);

export const KIP_OVER_TIME_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.kpiOverTime',
  {
    defaultMessage: 'KPI over time',
  }
);

export const MONITORS_DURATION_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.monitorDurationLabel',
  {
    defaultMessage: 'Monitor duration',
  }
);

export const WEB_APPLICATION_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.webApplication',
  {
    defaultMessage: 'Web Application',
  }
);

export const UP_LABEL = i18n.translate('xpack.observability.expView.fieldLabels.up', {
  defaultMessage: 'Up',
});

export const DOWN_LABEL = i18n.translate('xpack.observability.expView.fieldLabels.down', {
  defaultMessage: 'Down',
});
