/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { PageLoadDistribution } from '../PageLoadDistribution';
import { PageViewsTrend } from '../PageViewsTrend';

export function PageLoadAndViews() {
  return (
    <EuiFlexGroup gutterSize="s" wrap>
      <EuiFlexItem style={{ flexBasis: 650 }}>
        <EuiPanel>
          <PageLoadDistribution />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem style={{ flexBasis: 650 }}>
        <EuiPanel>
          <PageViewsTrend />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
