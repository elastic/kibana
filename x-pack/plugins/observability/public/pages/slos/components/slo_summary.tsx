/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiStat } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { HistoricalSummaryResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';

import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';
import { asPercentWithTwoDecimals } from '../../../../common/utils/formatters';
import { SloSparkline } from './slo_sparkline';

export interface Props {
  slo: SLOWithSummaryResponse;
  historicalSummary?: HistoricalSummaryResponse[];
  historicalSummaryLoading: boolean;
}

export function SloSummary({ slo, historicalSummary = [], historicalSummaryLoading }: Props) {
  const isSloFailed = slo.summary.status === 'VIOLATED' || slo.summary.status === 'DEGRADING';
  const titleColor = isSloFailed ? 'danger' : '';

  const historicalSliData = historicalSummary.map((data) => ({
    key: new Date(data.date).getTime(),
    value: data.status === 'NO_DATA' ? undefined : data.sliValue,
  }));
  const errorBudgetBurnDownData = historicalSummary.map((data) => ({
    key: new Date(data.date).getTime(),
    value: data.status === 'NO_DATA' ? undefined : data.errorBudget.remaining,
  }));

  return (
    <EuiFlexGroup direction="row" justifyContent="spaceBetween" gutterSize="xl">
      <EuiFlexItem grow={false} style={{ width: 210 }}>
        <EuiFlexGroup direction="row" responsive={false} gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false} style={{ width: 120 }}>
            <EuiStat
              description={i18n.translate('xpack.observability.slos.slo.stats.objective', {
                defaultMessage: '{objective} target',
                values: { objective: asPercentWithTwoDecimals(slo.objective.target, 1) },
              })}
              title={
                slo.summary.status === 'NO_DATA'
                  ? NOT_AVAILABLE_LABEL
                  : asPercentWithTwoDecimals(slo.summary.sliValue, 1)
              }
              titleColor={titleColor}
              titleSize="m"
              reverse
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SloSparkline
              chart="line"
              id="sli_history"
              state={isSloFailed ? 'error' : 'success'}
              data={historicalSliData}
              loading={historicalSummaryLoading}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false} style={{ width: 210 }}>
        <EuiFlexGroup direction="row" responsive={false} gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false} style={{ width: 120 }}>
            <EuiStat
              description={i18n.translate('xpack.observability.slos.slo.stats.budgetRemaining', {
                defaultMessage: 'Budget remaining',
              })}
              title={asPercentWithTwoDecimals(slo.summary.errorBudget.remaining, 1)}
              titleColor={titleColor}
              titleSize="m"
              reverse
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <SloSparkline
              chart="area"
              id="error_budget_burn_down"
              state={isSloFailed ? 'error' : 'success'}
              data={errorBudgetBurnDownData}
              loading={historicalSummaryLoading}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
