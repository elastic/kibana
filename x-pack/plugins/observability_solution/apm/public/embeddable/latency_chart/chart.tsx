/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { Alert } from '@kbn/observability-plugin/public';
import { useApmParams } from '../../hooks/use_apm_params';
import LatencyChart from '../../components/alerting/ui_components/alert_details_app_section/latency_chart';

export const APM_THROUGHPUT_CHART_EMBEDDABLE =
  'APM_THROUGHPUT_CHART_EMBEDDABLE';

export function APMLatencyChartEmbeddableComponent({
  alert,
}: {
  alert: Alert;
}) {
  const {
    query: {
      kuery,
      serviceName,
      transactionType,
      environment,
      rangeFrom,
      rangeTo,
    },
  } = useApmParams('/services/{serviceName}/overview');

  return (
    <LatencyChart
      serviceName={serviceName}
      transactionType={transactionType!}
      environment={environment}
      alert={alert}
      start={rangeFrom}
      end={rangeTo}
    />
  );
}
