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
import { useBrowserRunOnceMonitors } from '../../../../monitor_management/test_now_mode/browser/use_browser_run_once_monitors';
import {
  IN_PROGRESS_LABEL,
  PENDING_LABEL,
} from '../../../../monitor_management/test_now_mode/test_result_header';

export const BrowserMonitorProgress = ({
  configId,
  testRunId,
  duration,
  schedule,
  isUpdating,
  expectPings,
  updateMonitorStatus,
  stopProgressTrack,
}: {
  configId: string;
  testRunId: string;
  duration: number;
  schedule: SyntheticsMonitorSchedule;
  isUpdating: boolean;
  expectPings: number;
  updateMonitorStatus: () => void;
  stopProgressTrack: () => void;
}) => {
  const { data, checkGroupResults, lastUpdated, expectedSummariesLoaded } =
    useBrowserRunOnceMonitors({
      configId,
      testRunId,
      refresh: false,
      skipDetails: true,
      expectSummaryDocs: expectPings,
    });

  const journeyStarted = checkGroupResults.some((result) => result.journeyStarted);
  const [passedTime, setPassedTime] = useState(0);

  const startTime = useRef(Date.now());

  useEffect(() => {
    if (expectedSummariesLoaded) {
      updateMonitorStatus();
    }
  }, [updateMonitorStatus, expectedSummariesLoaded]);

  useEffect(() => {
    setPassedTime((Date.now() - startTime.current) * 1000);

    // Stop waiting for docs if time elapsed is more than monitor frequency
    const timeSinceLastDoc = Date.now() - lastUpdated;
    const usualDurationMilli = duration / 1000;
    const maxTimeout = scheduleToMilli(schedule) - usualDurationMilli;
    if (timeSinceLastDoc >= maxTimeout) {
      stopProgressTrack();
    }
  }, [data, checkGroupResults, lastUpdated, duration, schedule, stopProgressTrack]);

  if (journeyStarted && (isUpdating || passedTime > duration)) {
    return (
      <>
        <EuiBadge>{IN_PROGRESS_LABEL}</EuiBadge>
        <EuiProgress size="xs" />
      </>
    );
  }

  return (
    <>
      {journeyStarted ? (
        <>
          <EuiBadge>{IN_PROGRESS_LABEL}</EuiBadge>
          <EuiProgress value={passedTime} max={duration} size="xs" />
        </>
      ) : (
        <>
          <EuiBadge>{PENDING_LABEL}</EuiBadge>
          <EuiProgress size="xs" />
        </>
      )}
    </>
  );
};
