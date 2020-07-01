/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
  EuiPanel,
} from '@elastic/eui';
import React from 'react';
import { ClientMetrics } from './ClientMetrics';
import { PageViewsTrend } from './PageViewsTrend';
import { PageLoadDistribution } from './PageLoadDistribution';
import { I18LABELS } from './translations';

export function RumDashboard() {
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiPanel>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={1} data-cy={`client-metrics`}>
              <EuiTitle size="xs">
                <h3>{I18LABELS.pageLoadTimes}</h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              <ClientMetrics />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={3}>
              <PageLoadDistribution />
              <PageViewsTrend />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
