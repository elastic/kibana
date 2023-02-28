/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStat, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { WideChart } from './wide_chart';

export interface Props {
  data: Array<{ key: number; value: number | undefined }>;
  isLoading: boolean;
  slo: SLOWithSummaryResponse;
}

export function ErrorBudgetChartPanel({ data, isLoading, slo }: Props) {
  const isSloFailed = slo.summary.status === 'DEGRADING' || slo.summary.status === 'VIOLATED';

  return (
    <EuiPanel paddingSize="m" color="transparent" hasBorder>
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h2>
                {i18n.translate('xpack.observability.slos.sloDetails.errorBudgetChartPanel.title', {
                  defaultMessage: 'Error budget remaining',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText color="subdued" size="s">
              {i18n.translate(
                'xpack.observability.slos.sloDetails.errorBudgetChartPanel.duration',
                { defaultMessage: 'Last {duration}', values: { duration: slo.timeWindow.duration } }
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexGroup direction="row" gutterSize="m">
          <EuiFlexItem>
            <EuiStat
              titleColor={isSloFailed ? 'danger' : 'success'}
              title={`${Math.trunc(slo.summary.errorBudget.remaining * 100000) / 1000}%`}
              titleSize="s"
              description={i18n.translate(
                'xpack.observability.slos.sloDetails.errorBudgetChartPanel.remaining',
                { defaultMessage: 'remaining' }
              )}
              reverse
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexItem>
          <WideChart
            chart="area"
            id={i18n.translate('xpack.observability.slos.sloDetails.errorBudgetChartPanel.title', {
              defaultMessage: 'Error budget remaining',
            })}
            state={isSloFailed ? 'error' : 'success'}
            data={data}
            loading={isLoading}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
