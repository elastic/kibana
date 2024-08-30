/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import LatencyChart from '../../components/alerting/ui_components/alert_details_app_section/latency_chart';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { useEmbeddableProps } from '../common/use_embeddable_props';
import { TimeRangeCallout } from '../common/time_range_callout';
import { ServiceNameCallout } from '../common/service_name_callout';
import type { EmbeddableApmLatencyVizProps } from '../types';

export function APMAlertingChart({
  rule,
  alert,
  serviceName,
  environment = ENVIRONMENT_ALL.value,
  transactionType,
  transactionName,
  rangeFrom = 'now-15m',
  rangeTo = 'now',
  latencyThresholdInMicroseconds,
  kuery = '',
  filters,
}: EmbeddableApmLatencyVizProps) {
  const {
    transactionType: currentTransactionType,
    transactionTypes,
    setTransactionType,
    comparisonChartTheme,
    latencyAggregationType,
    setLatencyAggregationType,
    timeZone,
  } = useEmbeddableProps({
    rule,
    rangeFrom,
    rangeTo,
    kuery,
    serviceName,
    defaultTransactionType: transactionType,
  });

  if (!rangeFrom || !rangeTo) {
    return <TimeRangeCallout />;
  }

  if (!serviceName || !currentTransactionType) {
    return <ServiceNameCallout />;
  }

  return (
    <LatencyChart
      alert={alert}
      transactionType={currentTransactionType}
      transactionTypes={transactionTypes}
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
      kuery={kuery}
      filters={filters}
    />
  );
}
