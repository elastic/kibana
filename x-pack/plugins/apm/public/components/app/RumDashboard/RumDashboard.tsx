/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { ClientMetrics } from './ClientMetrics';
import { ImpressionTrend } from './ImpressionTrend';
import { PageLoadDistribution } from './PageLoadDistribution';
import { EndUserExperienceLabel } from './translations';

export function RumDashboard() {
  return (
    <>
      <EuiTitle>
        <h1>{EndUserExperienceLabel}</h1>
      </EuiTitle>
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <ClientMetrics />
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <PageLoadDistribution />
          <EuiSpacer size="xxl" />
          <ImpressionTrend />
          <EuiSpacer size="xxl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
