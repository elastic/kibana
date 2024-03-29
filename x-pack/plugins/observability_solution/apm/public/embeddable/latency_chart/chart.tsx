/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useApmParams } from '../../hooks/use_apm_params';
import { LatencyChart } from '../../components/shared/charts/latency_chart';

export const APM_THROUGHPUT_CHART_EMBEDDABLE =
  'APM_THROUGHPUT_CHART_EMBEDDABLE';

export function APMLatencyChartEmbeddableComponent() {
  const {
    query: { kuery },
  } = useApmParams('/services/{serviceName}/overview');

  return <LatencyChart kuery={kuery} />;
}
