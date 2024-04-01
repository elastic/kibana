/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import LatencyChart from '../../../components/alerting/ui_components/alert_details_app_section/latency_chart';
import { EmbeddableAPMAlertingVizProps } from '../types';
import { useAlertingProps } from '../use_alerting_props';
import { TimeRangeCallout } from '../time_range_callout';

export function APMAlertingLatencyChart({
  rule,
  alert,
  timeZone,
  rangeFrom,
  rangeTo,
  latencyThresholdInMicroseconds,
}: EmbeddableAPMAlertingVizProps & {
  latencyThresholdInMicroseconds?: number;
}) {
  const {
    environment,
    serviceName,
    transactionType,
    setTransactionType,
    transactionName,
    comparisonChartTheme,
    latencyAggregationType,
    setLatencyAggregationType,
  } = useAlertingProps({
    rule,
  });

  if (!rangeFrom || !rangeTo) {
    return <TimeRangeCallout />;
  }

  if (!serviceName || !transactionType) {
    return null;
  }

  return (
    <LatencyChart
      alert={alert}
      transactionType={transactionType}
      transactionName={transactionName}
      serviceName={serviceName}
      environment={environment}
      start={rangeFrom}
      end={rangeTo}
      comparisonChartTheme={comparisonChartTheme}
      timeZone={timeZone}
      latencyAggregationType={latencyAggregationType}
      setLatencyAggregationType={setLatencyAggregationType}
      setTransactionType={setTransactionType}
      comparisonEnabled={false}
      offset={''}
      customAlertEvaluationThreshold={latencyThresholdInMicroseconds}
    />
  );
}
