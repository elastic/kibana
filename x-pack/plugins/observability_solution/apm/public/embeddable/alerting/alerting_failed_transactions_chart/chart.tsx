/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import FailedTransactionChart from '../../../components/alerting/ui_components/alert_details_app_section/failed_transaction_chart';
import { ServiceNameCallout } from '../service_name_callout';
import { TimeRangeCallout } from '../time_range_callout';
import type { EmbeddableApmAlertingVizProps } from '../types';
import { useAlertingProps } from '../use_alerting_props';

export function APMAlertingFailedTransactionsChart({
  rule,
  serviceName,
  environment = ENVIRONMENT_ALL.value,
  rangeFrom = 'now-15m',
  rangeTo = 'now',
  transactionType,
  transactionName,
  kuery = '',
  filters,
}: EmbeddableApmAlertingVizProps) {
  const {
    transactionType: currentTransactionType,
    transactionTypes,
    setTransactionType,
    comparisonChartTheme,
    timeZone,
  } = useAlertingProps({
    rule,
    serviceName,
    rangeFrom,
    rangeTo,
    kuery,
    defaultTransactionType: transactionType,
  });

  if (!rangeFrom || !rangeTo) {
    return <TimeRangeCallout />;
  }

  if (!serviceName || !currentTransactionType) {
    return <ServiceNameCallout />;
  }

  return (
    <FailedTransactionChart
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
      kuery={kuery}
      filters={filters}
    />
  );
}
