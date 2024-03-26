/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ThroughputChart from '../../../components/alerting/ui_components/alert_details_app_section/throughput_chart';
import { EmbeddableAPMAlertingThroughputChartProps } from './types';
import { useAlertingProps } from '../use_alerting_props';
import { TimeRangeCallout } from '../time_range_callout';

export function APMAlertingThroughputChart({
  rule,
  alert,
  timeZone,
  rangeFrom,
  rangeTo,
}: EmbeddableAPMAlertingThroughputChartProps) {
  const {
    environment,
    serviceName,
    transactionType,
    transactionName,
    comparisonChartTheme,
    throughputAggregationType,
  } = useAlertingProps({
    rule,
  });

  if (!rangeFrom || !rangeTo) {
    return <TimeRangeCallout />;
  }

  return (
    <ThroughputChart
      alert={alert}
      transactionType={transactionType}
      transactionName={transactionName}
      serviceName={serviceName}
      environment={environment}
      start={rangeFrom}
      end={rangeTo}
      comparisonChartTheme={comparisonChartTheme}
      timeZone={timeZone}
      comparisonEnabled={false}
      offset={''}
    />
  );
}
