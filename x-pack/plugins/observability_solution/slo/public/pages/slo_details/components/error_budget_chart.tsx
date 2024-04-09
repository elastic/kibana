/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiStat } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useKibana } from '../../../utils/kibana_react';
import { toDuration, toMinutes } from '../../../utils/slo/duration';
import { ChartData } from '../../../typings/slo';
import { WideChart } from './wide_chart';

function formatTime(minutes: number) {
  if (minutes > 59) {
    const mins = minutes % 60;
    const hours = (minutes - mins) / 60;
    return i18n.translate('xpack.slo.sloDetails.errorBudgetChartPanel.minuteHoursLabel', {
      defaultMessage: '{hours}h {mins}m',
      values: { hours: Math.trunc(hours), mins: Math.trunc(mins) },
    });
  }
  return i18n.translate('xpack.slo.sloDetails.errorBudgetChartPanel.minuteLabel', {
    defaultMessage: '{minutes}m',
    values: { minutes },
  });
}
export interface Props {
  data: ChartData[];
  isLoading: boolean;
  slo: SLOWithSummaryResponse;
}

export function ErrorBudgetChart({ data, isLoading, slo }: Props) {
  const { uiSettings } = useKibana().services;
  const percentFormat = uiSettings.get('format:percent:defaultPattern');
  const isSloFailed = slo.summary.status === 'DEGRADING' || slo.summary.status === 'VIOLATED';
  let errorBudgetTimeRemainingFormatted;
  if (slo.budgetingMethod === 'timeslices' && slo.timeWindow.type === 'calendarAligned') {
    const totalSlices =
      toMinutes(toDuration(slo.timeWindow.duration)) /
      toMinutes(toDuration(slo.objective.timesliceWindow!));
    const errorBudgetRemainingInMinute =
      slo.summary.errorBudget.remaining * (slo.summary.errorBudget.initial * totalSlices);

    errorBudgetTimeRemainingFormatted = formatTime(
      errorBudgetRemainingInMinute >= 0 ? errorBudgetRemainingInMinute : 0
    );
  }
  return (
    <>
      <EuiFlexGroup direction="row" gutterSize="l" alignItems="flexStart" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiStat
            titleColor={isSloFailed ? 'danger' : 'success'}
            title={numeral(slo.summary.errorBudget.remaining).format(percentFormat)}
            titleSize="s"
            description={i18n.translate('xpack.slo.sloDetails.errorBudgetChartPanel.remaining', {
              defaultMessage: 'Remaining',
            })}
            reverse
          />
        </EuiFlexItem>
        {errorBudgetTimeRemainingFormatted ? (
          <EuiFlexItem grow={false}>
            <EuiStat
              titleColor={isSloFailed ? 'danger' : 'success'}
              title={errorBudgetTimeRemainingFormatted}
              titleSize="s"
              description={i18n.translate('xpack.slo.sloDetails.errorBudgetChartPanel.remaining', {
                defaultMessage: 'Remaining',
              })}
              reverse
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>

      <EuiFlexItem>
        <WideChart
          chart="area"
          id={i18n.translate('xpack.slo.sloDetails.errorBudgetChartPanel.chartTitle', {
            defaultMessage: 'Error budget remaining',
          })}
          state={isSloFailed ? 'error' : 'success'}
          data={data}
          isLoading={isLoading}
        />
      </EuiFlexItem>
    </>
  );
}
