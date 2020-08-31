/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { AnomalyDetectionPanel } from './anomaly_detection_panel';
import { AnalyticsPanel } from './analytics_panel';

interface Props {
  createAnomalyDetectionJobDisabled: boolean;
  createAnalyticsJobDisabled: boolean;
}

// Fetch jobs and determine what to show
export const OverviewContent: FC<Props> = ({
  createAnomalyDetectionJobDisabled,
  createAnalyticsJobDisabled,
}) => (
  <EuiFlexItem grow={3}>
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        <AnomalyDetectionPanel jobCreationDisabled={createAnomalyDetectionJobDisabled} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <AnalyticsPanel jobCreationDisabled={createAnalyticsJobDisabled} />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiFlexItem>
);
