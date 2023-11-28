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
import { ChartData } from '../../../typings/slo';
import { useKibana } from '../../../utils/kibana_react';
import { toDurationAdverbLabel, toDurationLabel } from '../../../utils/slo/labels';
import { WideChart } from './wide_chart';

export interface Props {
  data: ChartData[];
  isLoading: boolean;
  slo: SLOWithSummaryResponse;
}

export function SliChartPanel({ data, isLoading, slo }: Props) {
  const { uiSettings } = useKibana().services;
  const percentFormat = uiSettings.get('format:percent:defaultPattern');

  const isSloFailed = slo.summary.status === 'DEGRADING' || slo.summary.status === 'VIOLATED';
  const hasNoData = slo.summary.status === 'NO_DATA';

  return (
    <EuiPanel paddingSize="m" color="transparent" hasBorder data-test-subj="sliChartPanel">
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h2>
                {i18n.translate('xpack.observability.slo.sloDetails.sliHistoryChartPanel.title', {
                  defaultMessage: 'Historical SLI',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText color="subdued" size="s">
              {rollingTimeWindowTypeSchema.is(slo.timeWindow.type)
                ? i18n.translate(
                    'xpack.observability.slo.sloDetails.sliHistoryChartPanel.duration',
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
              title={hasNoData ? '-' : numeral(slo.summary.sliValue).format(percentFormat)}
              titleSize="s"
              description={i18n.translate(
                'xpack.observability.slo.sloDetails.sliHistoryChartPanel.current',
                { defaultMessage: 'Observed value' }
              )}
              reverse
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiStat
              title={numeral(slo.objective.target).format(percentFormat)}
              titleSize="s"
              description={i18n.translate(
                'xpack.observability.slo.sloDetails.sliHistoryChartPanel.objective',
                { defaultMessage: 'Objective' }
              )}
              reverse
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexItem>
          <WideChart
            chart="line"
            id={i18n.translate(
              'xpack.observability.slo.sloDetails.sliHistoryChartPanel.chartTitle',
              {
                defaultMessage: 'SLI value',
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
