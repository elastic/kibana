/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ThroughputChart from '../../../components/alerting/ui_components/alert_details_app_section/throughput_chart';
import { EmbeddableAPMAlertingVizProps } from '../types';
import { useAlertingProps } from '../use_alerting_props';
import { TimeRangeCallout } from '../time_range_callout';

export function APMAlertingThroughputChart({
  rule,
  timeZone,
  rangeFrom,
  rangeTo,
}: EmbeddableAPMAlertingVizProps) {
  const {
    environment,
    serviceName,
    transactionType,
    transactionName,
    comparisonChartTheme,
    setTransactionType,
  } = useAlertingProps({
    rule,
  });

  if (!rangeFrom || !rangeTo) {
    return <TimeRangeCallout />;
  }

  // Todo: Add error state
  if (!serviceName || !transactionType) {
    return null;
  }

  return (
    <ThroughputChart
      transactionType={transactionType}
      setTransactionType={setTransactionType}
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
