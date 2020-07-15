/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import React from 'react';
import { RumOverview } from '../RumDashboard';
import { RumHeader } from './RumHeader';

export function RumHome() {
  return (
    <div>
      <RumHeader>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h1>End User Experience</h1>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </RumHeader>
      <RumOverview />
    </div>
  );
}
