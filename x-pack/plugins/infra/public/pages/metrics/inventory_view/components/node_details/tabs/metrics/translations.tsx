/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const SYSTEM_METRIC_NAME = i18n.translate('xpack.infra.nodeDetails.metrics.system', {
  defaultMessage: 'System',
});

export const USER_METRIC_NAME = i18n.translate('xpack.infra.nodeDetails.metrics.user', {
  defaultMessage: 'User',
});

export const INBOUND_METRIC_NAME = i18n.translate('xpack.infra.nodeDetails.metrics.inbound', {
  defaultMessage: 'Inbound',
});

export const OUTBOUND_METRIC_NAME = i18n.translate('xpack.infra.nodeDetails.metrics.outbound', {
  defaultMessage: 'Outbound',
});

export const USED_MEMORY_METRIC_NAME = i18n.translate('xpack.infra.nodeDetails.metrics.used', {
  defaultMessage: 'Used',
});

export const CACHED_MEMORY_METRIC_NAME = i18n.translate('xpack.infra.nodeDetails.metrics.cached', {
  defaultMessage: 'Cached',
});

export const FREE_MEMORY_METRIC_NAME = i18n.translate('xpack.infra.nodeDetails.metrics.free', {
  defaultMessage: 'Free',
});

export const NETWORK_CHART_TITLE = i18n.translate(
  'xpack.infra.nodeDetails.metrics.charts.networkTitle',
  {
    defaultMessage: 'Network',
  }
);
export const MEMORY_CHART_TITLE = i18n.translate(
  'xpack.infra.nodeDetails.metrics.charts.memoryTitle',
  {
    defaultMessage: 'Memory',
  }
);
export const CPU_CHART_TITLE = i18n.translate('xpack.infra.nodeDetails.metrics.fcharts.cpuTitle', {
  defaultMessage: 'CPU',
});
export const LOAD_CHART_TITLE = i18n.translate('xpack.infra.nodeDetails.metrics.charts.loadTitle', {
  defaultMessage: 'Load',
});
