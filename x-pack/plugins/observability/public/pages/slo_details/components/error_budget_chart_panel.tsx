/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStat, EuiText, EuiTitle } from '@elastic/eui';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { WideChart } from './wide_chart';

export interface Props {
  data: Array<{ key: number; value: number | undefined }>;
  isLoading: boolean;
  summary: SLOWithSummaryResponse['summary'];
}

export function ErrorBudgetChartPanel({ data, isLoading, summary }: Props) {
  const isSloFailed = summary.status === 'DEGRADING' || summary.status === 'VIOLATED';
  return (
    <EuiPanel paddingSize="m" color="transparent" hasBorder>
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h2>Error budget burn down</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText color="subdued" size="s">
              Last 30 days
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexGroup direction="row" gutterSize="m">
          <EuiFlexItem>
            <EuiStat
              titleColor={isSloFailed ? 'danger' : 'success'}
              title={`${Math.trunc(summary.errorBudget.remaining * 100000) / 1000}%`}
              titleSize="s"
              description="Remaining"
              reverse
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexItem>
          <WideChart
            chart="area"
            id="Error budget remaining"
            state={isSloFailed ? 'error' : 'success'}
            data={data}
            loading={isLoading}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
