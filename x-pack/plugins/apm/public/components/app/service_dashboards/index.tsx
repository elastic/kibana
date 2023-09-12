/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { EmptyDashboards } from './empty_dashboards';
import { AddDashboard } from './actions';

export function ServiceDashboards() {
  return (
    <EuiPanel hasBorder={true}>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>Title Placeholder</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AddDashboard />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EmptyDashboards actions={<AddDashboard />} />
    </EuiPanel>
  );
}
