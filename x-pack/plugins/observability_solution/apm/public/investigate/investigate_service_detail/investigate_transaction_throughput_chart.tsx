/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ServiceOverviewThroughputChartWithoutAppContext } from '../../components/app/service_overview/service_overview_throughput_chart';

type InvestigateTransactionThroughputChartProps = Omit<
  React.ComponentProps<typeof ServiceOverviewThroughputChartWithoutAppContext>,
  'comparisonEnabled' | 'offset' | 'previousPeriodLabel' | 'preferredAnomalyTimeseries'
>;

export function InvestigateTransactionThroughputChart(
  props: InvestigateTransactionThroughputChartProps
) {
  return (
    <ServiceOverviewThroughputChartWithoutAppContext
      {...props}
      comparisonEnabled={false}
      previousPeriodLabel={undefined}
      offset={undefined}
      preferredAnomalyTimeseries={undefined}
    />
  );
}
