/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiProgress } from '@elastic/eui';
import React, { useEffect, useRef, useState } from 'react';
import { scheduleToMilli } from '../../../../../../common/lib/schedule_to_time';
import { SyntheticsMonitorSchedule } from '../../../../../../common/runtime_types';
import { useSimpleRunOnceMonitors } from '../../../../monitor_management/test_now_mode/simple/use_simple_run_once_monitors';
import { IN_PROGRESS_LABEL } from '../../../../monitor_management/test_now_mode/test_result_header';

export const SimpleMonitorProgress = ({
  monitorId,
  testRunId,
  duration,
  schedule,
  expectPings,
  isUpdating,
  updateMonitorStatus,
  stopProgressTrack,
}: {
  monitorId: string;
  testRunId: string;
  duration: number;
  schedule: SyntheticsMonitorSchedule;
  expectPings: number;
  isUpdating: boolean;
  updateMonitorStatus: () => void;
  stopProgressTrack: () => void;
}) => {
  const { summaryDocs, data, lastUpdated } = useSimpleRunOnceMonitors({
    configId: monitorId,
    testRunId,
    expectSummaryDocs: expectPings,
  });

  const startTime = useRef(Date.now());

  const [passedTime, setPassedTime] = useState(Date.now());

  useEffect(() => {
    if (summaryDocs?.length) {
      updateMonitorStatus();
    }
  }, [updateMonitorStatus, summaryDocs]);

  useEffect(() => {
    setPassedTime(Date.now() - startTime.current);

    // Stop waiting for docs if time elapsed is more than monitor frequency
    const timeSinceLastDoc = Date.now() - lastUpdated;
    const usualDurationMilli = duration / 1000;
    const maxTimeout = scheduleToMilli(schedule) - usualDurationMilli;
    if (timeSinceLastDoc >= maxTimeout) {
      stopProgressTrack();
    }
  }, [data, lastUpdated, duration, schedule, stopProgressTrack]);

  const passedTimeMicro = passedTime * 1000;

  if (isUpdating || passedTimeMicro > duration) {
    return (
      <>
        <EuiBadge>{IN_PROGRESS_LABEL}</EuiBadge>
        <EuiProgress size="xs" />
      </>
    );
  }

  return (
    <>
      <EuiBadge>{IN_PROGRESS_LABEL}</EuiBadge>
      <EuiProgress value={passedTimeMicro} max={duration} size="xs" />
    </>
  );
};
