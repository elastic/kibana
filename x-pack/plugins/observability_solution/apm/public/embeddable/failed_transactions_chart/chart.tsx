/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { ALERT_END } from '@kbn/rule-data-utils';
import FailedTransactionChart from '../../components/alerting/ui_components/alert_details_app_section/failed_transaction_chart';
import { useEmbeddableProps } from '../common/use_embeddable_props';
import { TimeRangeCallout } from '../common/time_range_callout';
import { ServiceNameCallout } from '../common/service_name_callout';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import type { EmbeddableApmVizProps } from '../types';

export function APMFailedTransactionsChart({
  rule,
  alert,
  serviceName,
  environment = ENVIRONMENT_ALL.value,
  rangeFrom = 'now-15m',
  rangeTo = 'now',
  transactionType,
  transactionName,
  kuery = '',
  filters,
}: EmbeddableApmVizProps) {
  const alertEnd =
    alert && alert.fields[ALERT_END] ? moment(alert.fields[ALERT_END]).valueOf() : undefined;
  const {
    transactionType: currentTransactionType,
    transactionTypes,
    setTransactionType,
    comparisonChartTheme,
    timeZone,
  } = useEmbeddableProps({
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
      alertStart={alert?.start}
      alertEnd={alertEnd}
    />
  );
}
