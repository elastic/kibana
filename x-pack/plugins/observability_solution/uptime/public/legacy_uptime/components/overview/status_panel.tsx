/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { PingHistogram } from '../monitor';
import { SnapshotComponent } from './snapshot';

const STATUS_CHART_HEIGHT = '160px';

export const StatusPanel = ({}) => (
  <EuiPanel hasBorder>
    <EuiFlexGroup gutterSize="l">
      <EuiFlexItem grow={2}>
        <SnapshotComponent height={STATUS_CHART_HEIGHT} />
      </EuiFlexItem>
      <EuiFlexItem grow={10}>
        <PingHistogram height={STATUS_CHART_HEIGHT} isResponsive={true} />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);
