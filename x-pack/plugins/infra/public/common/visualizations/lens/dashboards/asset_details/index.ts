/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hostMetricFlyoutCharts, hostMetricChartsFullPage } from './host/host_metric_charts';
import { hostKPICharts } from './host/host_kpi_charts';
import { kubernetesCharts } from './host/kubernetes_charts';

export const assetDetailsDashboards = {
  host: { hostMetricFlyoutCharts, hostMetricChartsFullPage, hostKPICharts, keyField: 'host.name' },
  kubernetes: {
    kubernetesCharts,
    keyField: 'kubernetes.node.name',
    dependsOn: ['kubernetes.node'],
  },
};
