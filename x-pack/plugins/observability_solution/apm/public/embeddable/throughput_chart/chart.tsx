/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import ThroughputChart from '../../components/alerting/ui_components/alert_details_app_section/throughput_chart';
import { EmbeddableApmVizProps } from '../types';
import { useEmbeddableProps } from '../common/use_embeddable_props';
import { TimeRangeCallout } from '../common/time_range_callout';
import { ServiceNameCallout } from '../common/service_name_callout';

export function APMThroughputChart({
  rule,
  rangeFrom = 'now-15m',
  rangeTo = 'now',
  transactionName,
  kuery,
  filters,
  serviceName,
  transactionType,
  environment = ENVIRONMENT_ALL.value,
}: EmbeddableApmVizProps) {
  const {
    comparisonChartTheme,
    setTransactionType,
    transactionType: currentTransactionType,
    transactionTypes,
    timeZone,
  } = useEmbeddableProps({
    rule,
    rangeTo,
    rangeFrom,
    defaultTransactionType: transactionType,
    serviceName,
  });

  if (!rangeFrom || !rangeTo) {
    return <TimeRangeCallout />;
  }

  if (!serviceName || !currentTransactionType) {
    return <ServiceNameCallout />;
  }

  return (
    <ThroughputChart
      transactionType={currentTransactionType}
      transactionTypes={transactionTypes}
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
      kuery={kuery}
      filters={filters}
    />
  );
}
