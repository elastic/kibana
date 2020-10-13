/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { VisitorBreakdown } from '../VisitorBreakdown';
import { VisitorBreakdownMap } from '../VisitorBreakdownMap';

export function VisitorBreakdownsPanel() {
  return (
    <EuiFlexGroup gutterSize="s" wrap>
      <EuiFlexItem style={{ flexBasis: 650 }}>
        <EuiPanel>
          <VisitorBreakdownMap />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem style={{ flexBasis: 650 }}>
        <EuiPanel>
          <VisitorBreakdown />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
