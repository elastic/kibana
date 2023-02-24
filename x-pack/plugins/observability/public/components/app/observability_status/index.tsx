/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  ALERT_APP,
  APM_APP,
  INFRA_LOGS_APP,
  INFRA_METRICS_APP,
  SYNTHETICS_APP,
  UX_APP,
} from '../../../context/constants';
import { ObservabilityStatusBoxes } from './observability_status_boxes';
import { getContent } from './content';
import { ObservabilityAppServices } from '../../../application/types';
import { useFetchInfraLogsHasData } from '../../../hooks/overview/use_fetch_infra_logs_has_data';
import { useFetchApmServicesHasData } from '../../../hooks/overview/use_fetch_apm_services_has_data';
import { useFetchInfraMetricsHasData } from '../../../hooks/overview/use_fetch_infra_metrics_has_data';
import { useFetchSyntheticsUptimeHasData } from '../../../hooks/overview/use_fetch_synthetics_uptime_has_data';
import { useFetchUxHasData } from '../../../hooks/overview/use_fetch_ux_has_data';
import { useFetchObservabilityAlerts } from '../../../hooks/use_fetch_observability_alerts';

export function ObservabilityStatus() {
  const { http, docLinks } = useKibana<ObservabilityAppServices>().services;

  const { data: apmServices } = useFetchApmServicesHasData();
  const { data: infraLogs } = useFetchInfraLogsHasData();
  const { data: infraMetrics } = useFetchInfraMetricsHasData();
  const { data: syntheticsUptime } = useFetchSyntheticsUptimeHasData();
  const { data: ux } = useFetchUxHasData();
  const { alerts } = useFetchObservabilityAlerts();

  const hasDataMap = {
    [APM_APP]: apmServices?.hasData,
    [INFRA_LOGS_APP]: infraLogs?.hasData,
    [INFRA_METRICS_APP]: infraMetrics?.hasData,
    [SYNTHETICS_APP]: syntheticsUptime?.hasData,
    [UX_APP]: ux?.hasData,
    [ALERT_APP]: alerts && alerts.length > 0,
  };

  const content = getContent(http, docLinks);

  const boxes = content.map((app) => {
    return {
      ...app,
      hasData: hasDataMap[app.id as keyof typeof hasDataMap] ?? false,
      modules: [],
    };
  });

  return <ObservabilityStatusBoxes boxes={boxes} />;
}
