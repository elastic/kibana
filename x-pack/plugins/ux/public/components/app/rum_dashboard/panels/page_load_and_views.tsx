/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { PageLoadDistribution } from '../page_load_distribution';
import { PageViewsTrend } from '../page_views_trend';

export function PageLoadAndViews() {
  return (
    <EuiFlexGroup gutterSize="s" wrap>
      <EuiFlexItem style={{ flexBasis: 650 }}>
        <EuiPanel hasBorder={true}>
          <PageLoadDistribution />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem style={{ flexBasis: 650 }}>
        <EuiPanel hasBorder={true}>
          <PageViewsTrend />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
