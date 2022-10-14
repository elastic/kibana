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
import { ServerlessMetrics } from './serverless_metrics';

export function ServerLessMetrics() {
  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <ServerlessSummary />
      </EuiFlexItem>
      <EuiFlexItem>
        <ServerlessFunctions />
      </EuiFlexItem>
      <EuiFlexItem>
        <ServerlessMetrics />
      </EuiFlexItem>
      <EuiFlexItem>
        <ServerlessActiveInstances />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
