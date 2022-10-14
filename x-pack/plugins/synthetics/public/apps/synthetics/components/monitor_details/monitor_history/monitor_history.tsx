/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React from 'react';

export const MonitorHistory = () => {
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>Date picker</EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem>
            <EuiPanel hasShadow={false} hasBorder={true}>
              Stats
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel hasShadow={false} hasBorder={true}>
              Duration trend
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel hasShadow={false} hasBorder={true}>
          Status
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel hasShadow={false} hasBorder={true}>
          Test runs
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
