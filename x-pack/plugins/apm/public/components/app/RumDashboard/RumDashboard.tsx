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
import { getWhatIsGoingOnLabel } from './translations';
import { useUrlParams } from '../../../hooks/useUrlParams';

export function RumDashboard() {
  const { urlParams } = useUrlParams();

  const { environment } = urlParams;

  let environmentLabel = environment || 'all environments';

  if (environment === 'ENVIRONMENT_NOT_DEFINED') {
    environmentLabel = 'undefined environment';
  }

  return (
    <>
      <EuiTitle>
        <h1>{getWhatIsGoingOnLabel(environmentLabel)}</h1>
      </EuiTitle>
      <EuiSpacer size="l" />
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={1} data-cy={`client-metrics`}>
          <ClientMetrics />
        </EuiFlexItem>
        <EuiFlexItem grow={3}>
          <PageLoadDistribution />
          <EuiSpacer size="xxl" />
          <ImpressionTrend />
          <EuiSpacer size="xxl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
