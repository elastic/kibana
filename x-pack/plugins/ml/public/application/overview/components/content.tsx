/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { AnomalyDetectionPanel } from './anomaly_detection_panel';
import { AnalyticsPanel } from './analytics_panel';

interface Props {
  createAnomalyDetectionJobDisabled: boolean;
  setAdLazyJobCount: React.Dispatch<React.SetStateAction<number>>;
  setDfaLazyJobCount: React.Dispatch<React.SetStateAction<number>>;
}

export const OverviewContent: FC<Props> = ({
  createAnomalyDetectionJobDisabled,
  setAdLazyJobCount,
  setDfaLazyJobCount,
}) => (
  <>
    <AnomalyDetectionPanel
      jobCreationDisabled={createAnomalyDetectionJobDisabled}
      setLazyJobCount={setAdLazyJobCount}
    />
    <EuiSpacer size="m" />
    <AnalyticsPanel setLazyJobCount={setDfaLazyJobCount} />
  </>
);
