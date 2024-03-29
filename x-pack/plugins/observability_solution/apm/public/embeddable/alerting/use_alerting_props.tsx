/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Rule } from '@kbn/alerting-plugin/common';
import { useApmServiceContext } from '../../context/apm_service/use_apm_service_context';
import { useEnvironmentsContext } from '../../context/environments_context/use_environments_context';
import { useAnyOfApmParams } from '../../hooks/use_apm_params';
import { getComparisonChartTheme } from '../../components/shared/time_comparison/get_comparison_chart_theme';
import { getAggsTypeFromRule } from '../../components/alerting/ui_components/alert_details_app_section/helpers';
import { LatencyAggregationType } from '../../../common/latency_aggregation_types';

export function useAlertingProps({
  rule,
}: {
  rule: Rule<{ aggregationType: LatencyAggregationType }>;
}) {
  const { transactionType, serviceName } = useApmServiceContext();
  const { environment } = useEnvironmentsContext();
  const {
    query: { transactionName },
  } = useAnyOfApmParams('/services/{serviceName}/transactions/view');

  const params = rule.params;
  const latencyAggregationType = getAggsTypeFromRule(params.aggregationType);
  const comparisonChartTheme = getComparisonChartTheme();

  return {
    transactionType,
    transactionName,
    serviceName,
    environment,
    latencyAggregationType,
    comparisonChartTheme,
  };
}
