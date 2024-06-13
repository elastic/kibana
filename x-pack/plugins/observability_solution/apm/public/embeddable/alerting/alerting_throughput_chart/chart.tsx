/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import React from 'react';
import { ALERT_END } from '@kbn/rule-data-utils';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import ThroughputChart from '../../../components/alerting/ui_components/alert_details_app_section/throughput_chart';
import { EmbeddableApmAlertingVizProps } from '../types';
import { useAlertingProps } from '../use_alerting_props';
import { TimeRangeCallout } from '../time_range_callout';
import { ServiceNameCallout } from '../service_name_callout';

export function APMAlertingThroughputChart({
  rule,
  alert,
  rangeFrom = 'now-15m',
  rangeTo = 'now',
  transactionName,
  kuery,
  filters,
  serviceName,
  transactionType,
  environment = ENVIRONMENT_ALL.value,
}: EmbeddableApmAlertingVizProps) {
  const {
    comparisonChartTheme,
    setTransactionType,
    transactionType: currentTransactionType,
    transactionTypes,
    timeZone,
  } = useAlertingProps({
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

  const alertEnd = alert.fields[ALERT_END] ? moment(alert.fields[ALERT_END]).valueOf() : undefined;

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
      alertStart={alert.start}
      alertEnd={alertEnd}
      comparisonChartTheme={comparisonChartTheme}
      timeZone={timeZone}
      comparisonEnabled={false}
      offset={''}
      kuery={kuery}
      filters={filters}
    />
  );
}
