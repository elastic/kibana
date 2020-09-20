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
  EuiResizableContainer,
} from '@elastic/eui';
import React from 'react';
import { ClientMetrics } from './ClientMetrics';
import { PageViewsTrend } from './PageViewsTrend';
import { PageLoadDistribution } from './PageLoadDistribution';
import { I18LABELS } from './translations';
import { VisitorBreakdown } from './VisitorBreakdown';
import { UXMetrics } from './UXMetrics';
import { VisitorBreakdownMap } from './VisitorBreakdownMap';

export const FULL_HEIGHT = { height: '100%' };

export function RumDashboard() {
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiPanel>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={1} data-cy={`client-metrics`}>
              <EuiTitle size="xs">
                <h3>{I18LABELS.pageLoadDuration}</h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              <ClientMetrics />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <UXMetrics />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiResizableContainer style={{ height: '800px' }} direction="vertical">
          {(EuiResizablePanel, EuiResizableButton) => (
            <>
              <EuiResizablePanel initialSize={40} minSize="40%">
                <EuiResizableContainer style={FULL_HEIGHT}>
                  {(EuiResizablePanel, EuiResizableButton) => (
                    <>
                      <EuiResizablePanel initialSize={50} minSize="20%">
                        <EuiPanel style={FULL_HEIGHT}>
                          <PageLoadDistribution />
                        </EuiPanel>
                      </EuiResizablePanel>
                      <EuiResizableButton />
                      <EuiResizablePanel initialSize={50} minSize="20%">
                        <EuiPanel style={FULL_HEIGHT}>
                          <PageViewsTrend />
                        </EuiPanel>
                      </EuiResizablePanel>
                    </>
                  )}
                </EuiResizableContainer>
              </EuiResizablePanel>
              <EuiResizableButton />
              <EuiResizablePanel initialSize={60} minSize="10%">
                <EuiPanel>
                  <EuiFlexGroup justifyContent="spaceBetween">
                    <EuiFlexItem grow={3}>
                      <VisitorBreakdown />
                    </EuiFlexItem>
                    <EuiFlexItem grow={3}>
                      <VisitorBreakdownMap />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiResizablePanel>
            </>
          )}
        </EuiResizableContainer>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
