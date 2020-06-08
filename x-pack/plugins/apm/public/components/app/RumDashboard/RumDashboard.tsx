/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ClientMetrics } from './ClientMetrics';
import { ImpressionTrend } from './ImpressionTrend';
import { PageLoadDistribution } from './PageLoadDistribution';

export function RumDashboard() {
  return (
    <>
      <EuiTitle>
        <h1>
          {i18n.translate('xpack.apm.rum.dashboard.title', {
            defaultMessage: 'End User Experience',
          })}
        </h1>
      </EuiTitle>
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <ClientMetrics />
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <PageLoadDistribution />
          <ImpressionTrend />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
