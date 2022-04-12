/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { SimpleMonitorProgress } from './simple_monitor_progress';
import { BrowserMonitorProgress } from './browser_monitor_progress';
import { DataStream, SyntheticsMonitorSchedule } from '../../../../../../common/runtime_types';
import { useUpdatedMonitor } from './use_updated_monitor';
import { refreshedMonitorSelector } from '../../../../../state/reducers/monitor_list';

export const MonitorProgress = ({
  monitorId,
  configId,
  testRunId,
  duration,
  monitorType,
  schedule,
  expectPings,
  stopProgressTrack,
}: {
  monitorId: string;
  configId: string;
  testRunId: string;
  duration: number;
  monitorType: DataStream;
  schedule: SyntheticsMonitorSchedule;
  expectPings: number;
  stopProgressTrack: () => void;
}) => {
  const { updateMonitorStatus, isUpdating } = useUpdatedMonitor({
    testRunId,
    monitorId,
  });

  const refreshedMonitorId = useSelector(refreshedMonitorSelector);

  useEffect(() => {
    if (refreshedMonitorId.includes(monitorId)) {
      stopProgressTrack();
    }
  }, [isUpdating, monitorId, refreshedMonitorId, stopProgressTrack]);

  return monitorType === 'browser' ? (
    <BrowserMonitorProgress
      configId={configId}
      testRunId={testRunId}
      duration={duration}
      schedule={schedule}
      expectPings={expectPings}
      isUpdating={isUpdating}
      updateMonitorStatus={updateMonitorStatus}
      stopProgressTrack={stopProgressTrack}
    />
  ) : (
    <SimpleMonitorProgress
      monitorId={monitorId}
      testRunId={testRunId}
      duration={duration}
      schedule={schedule}
      expectPings={expectPings}
      isUpdating={isUpdating}
      updateMonitorStatus={updateMonitorStatus}
      stopProgressTrack={stopProgressTrack}
    />
  );
};
