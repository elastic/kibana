/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useAnyOfApmParams } from '../../hooks/use_apm_params';
import { ServiceOverviewThroughputChart } from '../../components/app/service_overview/service_overview_throughput_chart';

export const APM_THROUGHPUT_CHART_EMBEDDABLE =
  'APM_THROUGHPUT_CHART_EMBEDDABLE';

export function APMThroughputChartEmbeddableComponent() {
  const {
    query: { kuery, transactionName },
  } = useAnyOfApmParams('/services/{serviceName}/transactions/view');

  return (
    <ServiceOverviewThroughputChart
      kuery={kuery}
      transactionName={transactionName}
    />
  );
}
