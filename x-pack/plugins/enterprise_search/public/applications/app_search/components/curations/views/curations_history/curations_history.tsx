/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import {
  AutomatedCurationsHistoryPanel,
  IgnoredQueriesPanel,
  RejectedCurationsHistoryPanel,
} from './components';

export const CurationsHistory: React.FC = () => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={2}>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <AutomatedCurationsHistoryPanel />
          </EuiFlexItem>
          <EuiFlexItem>
            <RejectedCurationsHistoryPanel />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        <IgnoredQueriesPanel />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
