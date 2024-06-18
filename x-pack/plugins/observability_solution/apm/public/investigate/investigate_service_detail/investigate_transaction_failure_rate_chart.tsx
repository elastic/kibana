/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FailedTransactionRateWithoutAppContext } from '../../components/shared/charts/failed_transaction_rate_chart';

type InvestigateTransactionFailureRateChartProps = Omit<
  React.ComponentProps<typeof FailedTransactionRateWithoutAppContext>,
  | 'offset'
  | 'comparisonEnabled'
  | 'previousPeriodLabel'
  | 'preferredAnomalyTimeseries'
  | 'showAnnotations'
>;

export function InvestigateTransactionFailureRateChart({
  ...passThroughProps
}: InvestigateTransactionFailureRateChartProps) {
  return (
    <FailedTransactionRateWithoutAppContext
      {...passThroughProps}
      previousPeriodLabel={undefined}
      offset={undefined}
      comparisonEnabled={false}
      preferredAnomalyTimeseries={undefined}
      showAnnotations
    />
  );
}
