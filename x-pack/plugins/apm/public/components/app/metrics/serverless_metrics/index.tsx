/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { ServerlessFunctions } from './serverless_functions';
import { ServerlessSummary } from './serverless_summary';
import { ServerlessActiveInstances } from './serverless_active_instances';
import { ServerlessMetricsCharts } from './serverless_metrics_charts';
import { ChartPointerEventContextProvider } from '../../../../context/chart_pointer_event/chart_pointer_event_context';

interface Props {
  serverlessId?: string;
}

export function ServerlessMetrics({ serverlessId }: Props) {
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <ServerlessSummary serverlessId={serverlessId} />
      </EuiFlexItem>
      {!serverlessId && (
        <EuiFlexItem>
          <ServerlessFunctions />
        </EuiFlexItem>
      )}
      <ChartPointerEventContextProvider>
        <EuiFlexItem>
          <ServerlessMetricsCharts serverlessId={serverlessId} />
        </EuiFlexItem>
        <EuiFlexItem>
          <ServerlessActiveInstances serverlessId={serverlessId} />
        </EuiFlexItem>
      </ChartPointerEventContextProvider>
    </EuiFlexGroup>
  );
}
