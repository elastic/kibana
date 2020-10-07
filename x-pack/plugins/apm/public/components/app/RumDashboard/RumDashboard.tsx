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
import { I18LABELS } from './translations';
import { UXMetrics } from './UXMetrics';
import { ImpactfulMetrics } from './ImpactfulMetrics';
import { PageLoadAndViews } from './Panels/PageLoadAndViews';
import { VisitorBreakdownsPanel } from './Panels/VisitorBreakdowns';
import { useBreakPoints } from './hooks/useBreakPoints';

export const FULL_HEIGHT = { height: '100%' };

export function RumDashboard() {
  const { isLarge, isSmall } = useBreakPoints();

  return (
    <EuiFlexGroup direction={isSmall ? 'row' : 'column'} gutterSize="s">
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
        <EuiResizableContainer
          style={{ height: isLarge ? '1400px' : '850px' }}
          direction="vertical"
        >
          {(EuiResizablePanel, EuiResizableButton) => (
            <>
              <EuiResizablePanel initialSize={40} minSize="40%">
                <PageLoadAndViews />
              </EuiResizablePanel>
              <EuiResizableButton />
              <EuiResizablePanel initialSize={60} minSize="10%">
                <VisitorBreakdownsPanel />
              </EuiResizablePanel>
            </>
          )}
        </EuiResizableContainer>
      </EuiFlexItem>
      <EuiFlexItem>
        <ImpactfulMetrics />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
