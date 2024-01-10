/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStat, EuiText, EuiTitle } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { rollingTimeWindowTypeSchema, SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { toDuration, toMinutes } from '../../../utils/slo/duration';
import { ChartData } from '../../../typings/slo';
import { useKibana } from '../../../utils/kibana_react';
import { toDurationAdverbLabel, toDurationLabel } from '../../../utils/slo/labels';
import { WideChart } from './wide_chart';

export interface Props {
  data: ChartData[];
  isLoading: boolean;
  slo: SLOWithSummaryResponse;
}

function formatTime(minutes: number) {
  if (minutes > 59) {
    const mins = minutes % 60;
    const hours = (minutes - mins) / 60;
    return i18n.translate(
      'xpack.observability.slo.sloDetails.errorBudgetChartPanel.minuteHoursLabel',
      {
        defaultMessage: '{hours}h {mins}m',
        values: { hours: Math.trunc(hours), mins: Math.trunc(mins) },
      }
    );
  }
  return i18n.translate('xpack.observability.slo.sloDetails.errorBudgetChartPanel.minuteLabel', {
    defaultMessage: '{minutes}m',
    values: { minutes },
  });
}

export function ErrorBudgetChartPanel({ data, isLoading, slo }: Props) {
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
    <EuiPanel paddingSize="m" color="transparent" hasBorder data-test-subj="errorBudgetChartPanel">
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h2>
                {i18n.translate('xpack.observability.slo.sloDetails.errorBudgetChartPanel.title', {
                  defaultMessage: 'Error budget burn down',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText color="subdued" size="s">
              {rollingTimeWindowTypeSchema.is(slo.timeWindow.type)
                ? i18n.translate(
                    'xpack.observability.slo.sloDetails.errorBudgetChartPanel.duration',
                    {
                      defaultMessage: 'Last {duration}',
                      values: { duration: toDurationLabel(slo.timeWindow.duration) },
                    }
                  )
                : toDurationAdverbLabel(slo.timeWindow.duration)}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexGroup direction="row" gutterSize="l" alignItems="flexStart" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiStat
              titleColor={isSloFailed ? 'danger' : 'success'}
              title={numeral(slo.summary.errorBudget.remaining).format(percentFormat)}
              titleSize="s"
              description={i18n.translate(
                'xpack.observability.slo.sloDetails.errorBudgetChartPanel.remaining',
                { defaultMessage: 'Remaining' }
              )}
              reverse
            />
          </EuiFlexItem>
          {errorBudgetTimeRemainingFormatted ? (
            <EuiFlexItem grow={false}>
              <EuiStat
                titleColor={isSloFailed ? 'danger' : 'success'}
                title={errorBudgetTimeRemainingFormatted}
                titleSize="s"
                description={i18n.translate(
                  'xpack.observability.slo.sloDetails.errorBudgetChartPanel.remaining',
                  { defaultMessage: 'Remaining' }
                )}
                reverse
              />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>

        <EuiFlexItem>
          <WideChart
            chart="area"
            id={i18n.translate(
              'xpack.observability.slo.sloDetails.errorBudgetChartPanel.chartTitle',
              {
                defaultMessage: 'Error budget remaining',
              }
            )}
            state={isSloFailed ? 'error' : 'success'}
            data={data}
            isLoading={isLoading}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
