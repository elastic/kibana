/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiFlexGrid, EuiFlexItem } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { HostMetricsDocsLink } from '../../../../../../components/lens';
import { MetricChart } from './metric_chart';
import { CHARTS_IN_ORDER } from './dashboard_config';

export const MetricsGrid = React.memo(() => {
  return (
    <>
      <HostMetricsDocsLink />
      <EuiSpacer size="s" />
      <EuiFlexGrid columns={2} gutterSize="s" data-test-subj="hostsView-metricChart">
        {CHARTS_IN_ORDER.map((chartProp, index) => (
          <EuiFlexItem key={index} grow={false}>
            <MetricChart {...chartProp} />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </>
  );
});
