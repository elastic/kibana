/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { ServerlessMetrics } from '../../metrics/serverless_metrics';

interface Props {
  serverlessFunctionName: string;
}

export function ServerlessMetricsDetails({ serverlessFunctionName }: Props) {
  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiTitle>
          <h2>{serverlessFunctionName}</h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <ServerlessMetrics serverlessFunctionName={serverlessFunctionName} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
