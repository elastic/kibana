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

export const DCL_LABEL = i18n.translate('xpack.observability.expView.fieldLabels.dcl', {
  defaultMessage: 'DOM content loaded',
});

export const DOCUMENT_ONLOAD_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.onload',
  {
    defaultMessage: 'Document complete (onLoad)',
  }
);

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

export const PINGS_LABEL = i18n.translate('xpack.observability.expView.fieldLabels.pings', {
  defaultMessage: 'Pings',
});

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
export const LABELS_FIELD = i18n.translate('xpack.observability.expView.fieldLabels.labels', {
  defaultMessage: 'Labels',
});
export const LABELS_BREAKDOWN = i18n.translate(
  'xpack.observability.expView.fieldLabels.chooseField',
  {
    defaultMessage: 'Labels field',
  }
);
export const KPI_LABEL = i18n.translate('xpack.observability.expView.fieldLabels.kpi', {
  defaultMessage: 'KPI',
});

export const PERF_DIST_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.performanceDistribution',
  {
    defaultMessage: 'Performance distribution',
  }
);

export const CORE_WEB_VITALS_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.coreWebVitals',
  {
    defaultMessage: 'Core web vitals',
  }
);

export const DEVICE_DISTRIBUTION_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.deviceDistribution',
  {
    defaultMessage: 'Device distribution',
  }
);

export const MOBILE_RESPONSE_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.mobileResponse',
  {
    defaultMessage: 'Mobile response',
  }
);

export const MEMORY_USAGE_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.memoryUsage',
  {
    defaultMessage: 'System memory usage',
  }
);

export const KPI_OVER_TIME_LABEL = i18n.translate(
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

export const STEP_DURATION_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.stepDurationLabel',
  {
    defaultMessage: 'Step duration',
  }
);

export const STEP_NAME_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.stepNameLabel',
  {
    defaultMessage: 'Step name',
  }
);

export const WEB_APPLICATION_LABEL = i18n.translate(
  'xpack.observability.expView.fieldLabels.webApplication',
  {
    defaultMessage: 'Web Application',
  }
);

export const UP_LABEL = i18n.translate('xpack.observability.expView.fieldLabels.upPings', {
  defaultMessage: 'Up Pings',
});

export const DOWN_LABEL = i18n.translate('xpack.observability.expView.fieldLabels.downPings', {
  defaultMessage: 'Down Pings',
});

export const CARRIER_NAME = i18n.translate('xpack.observability.expView.fieldLabels.carrierName', {
  defaultMessage: 'Carrier Name',
});

export const REQUEST_METHOD = i18n.translate(
  'xpack.observability.expView.fieldLabels.requestMethod',
  {
    defaultMessage: 'Request Method',
  }
);

export const CONNECTION_TYPE = i18n.translate(
  'xpack.observability.expView.fieldLabels.connectionType',
  {
    defaultMessage: 'Connection Type',
  }
);
export const HOST_OS = i18n.translate('xpack.observability.expView.fieldLabels.hostOS', {
  defaultMessage: 'Host OS',
});

export const SERVICE_VERSION = i18n.translate(
  'xpack.observability.expView.fieldLabels.serviceVersion',
  {
    defaultMessage: 'Service Version',
  }
);

export const OS_PLATFORM = i18n.translate('xpack.observability.expView.fieldLabels.osPlatform', {
  defaultMessage: 'OS Platform',
});

export const DEVICE_MODEL = i18n.translate('xpack.observability.expView.fieldLabels.deviceModel', {
  defaultMessage: 'Device Model',
});

export const CARRIER_LOCATION = i18n.translate(
  'xpack.observability.expView.fieldLabels.carrierLocation',
  {
    defaultMessage: 'Carrier Location',
  }
);

export const RESPONSE_LATENCY = i18n.translate(
  'xpack.observability.expView.fieldLabels.responseLatency',
  {
    defaultMessage: 'Latency',
  }
);

export const MOBILE_APP = i18n.translate('xpack.observability.expView.fieldLabels.mobileApp', {
  defaultMessage: 'Mobile App',
});

export const SYSTEM_MEMORY_USAGE = i18n.translate(
  'xpack.observability.expView.fieldLabels.mobile.memoryUsage',
  {
    defaultMessage: 'System memory usage',
  }
);

export const CPU_USAGE = i18n.translate('xpack.observability.expView.fieldLabels.cpuUsage', {
  defaultMessage: 'CPU usage',
});

export const SYSTEM_CPU_USAGE = i18n.translate(
  'xpack.observability.expView.fieldLabels.cpuUsage.system',
  {
    defaultMessage: 'System CPU usage',
  }
);

export const DOCKER_CPU_USAGE = i18n.translate(
  'xpack.observability.expView.fieldLabels.cpuUsage.docker',
  {
    defaultMessage: 'Docker CPU usage',
  }
);

export const K8S_POD_CPU_USAGE = i18n.translate(
  'xpack.observability.expView.fieldLabels.cpuUsage.k8sDocker',
  {
    defaultMessage: 'K8s pod CPU usage',
  }
);

export const TRANSACTIONS_PER_MINUTE = i18n.translate(
  'xpack.observability.expView.fieldLabels.transactionPerMinute',
  {
    defaultMessage: 'Throughput',
  }
);

export const NUMBER_OF_DEVICES = i18n.translate(
  'xpack.observability.expView.fieldLabels.numberOfDevices',
  {
    defaultMessage: 'Number of Devices',
  }
);
