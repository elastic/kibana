/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
import { I18LABELS } from './translations';
import { UXMetrics } from './UXMetrics';
import { ImpactfulMetrics } from './ImpactfulMetrics';
import { PageLoadAndViews } from './Panels/PageLoadAndViews';
import { VisitorBreakdownsPanel } from './Panels/VisitorBreakdowns';
import { useBreakPoints } from '../../../hooks/use_break_points';
import { getPercentileLabel } from './UXMetrics/translations';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';

export function RumDashboard() {
  const {
    urlParams: { percentile },
  } = useUrlParams();
  const { isSmall } = useBreakPoints();

  return (
    <EuiFlexGroup direction={isSmall ? 'row' : 'column'} gutterSize="s">
      <EuiFlexItem>
        <EuiPanel>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={1} data-cy={`client-metrics`}>
              <EuiTitle size="xs">
                <h3>
                  {I18LABELS.pageLoad} ({getPercentileLabel(percentile!)})
                </h3>
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
        <PageLoadAndViews />
      </EuiFlexItem>
      <EuiFlexItem>
        <VisitorBreakdownsPanel />
      </EuiFlexItem>
      <EuiFlexItem>
        <ImpactfulMetrics />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
