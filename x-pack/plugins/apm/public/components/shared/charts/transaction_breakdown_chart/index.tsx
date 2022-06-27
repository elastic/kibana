/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useAnnotationsContext } from '../../../../context/annotations/use_annotations_context';
import { useTransactionBreakdown } from './use_transaction_breakdown';
import { BreakdownChart } from '../breakdown_chart';

export function TransactionBreakdownChart({
  height,
  showAnnotations = true,
  environment,
  kuery,
}: {
  height?: number;
  showAnnotations?: boolean;
  environment: string;
  kuery: string;
}) {
  const { data, status } = useTransactionBreakdown({ environment, kuery });
  const { annotations } = useAnnotationsContext();
  const { timeseries } = data;

  return (
    <EuiPanel hasBorder={true}>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.apm.transactionBreakdown.chartTitle', {
                  defaultMessage: 'Time spent by span type',
                })}
              </h3>
            </EuiTitle>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiIconTip
              content={i18n.translate(
                'xpack.apm.transactionBreakdown.chartHelp',
                {
                  defaultMessage:
                    'The average duration of each span type. "app" indicates something was happening within the service—this could mean that the time was spent in application code and not in database or external requests, or that APM agent auto-instrumentation doesn\'t cover the executed code.',
                }
              )}
              position="right"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <BreakdownChart
            fetchStatus={status}
            height={height}
            annotations={annotations}
            showAnnotations={showAnnotations}
            timeseries={timeseries}
            yAxisType="percentage"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
