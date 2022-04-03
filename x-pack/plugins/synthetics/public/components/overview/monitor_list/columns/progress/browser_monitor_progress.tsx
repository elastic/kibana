/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiProgress } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { useBrowserRunOnceMonitors } from '../../../../monitor_management/test_now_mode/browser/use_browser_run_once_monitors';
import {
  IN_PROGRESS_LABEL,
  PENDING_LABEL,
} from '../../../../monitor_management/test_now_mode/test_result_header';

export const BrowserMonitorProgress = ({
  configId,
  testRunId,
  duration,
  isUpdating,
  updateMonitorStatus,
}: {
  configId: string;
  testRunId: string;
  duration: number;
  isUpdating: boolean;
  updateMonitorStatus: () => void;
}) => {
  const { journeyStarted, summaryDoc, data } = useBrowserRunOnceMonitors({
    configId,
    testRunId,
    refresh: false,
    skipDetails: true,
  });

  const [startTime, setStartTime] = useState(Date.now());
  const [passedTime, setPassedTime] = useState(0);

  useEffect(() => {
    if (summaryDoc) {
      updateMonitorStatus();
    }
  }, [updateMonitorStatus, summaryDoc]);

  useEffect(() => {
    const interVal = setInterval(() => {
      if (journeyStarted) {
        setPassedTime((Date.now() - startTime) * 1000);
      }
    }, 500);
    const startTimeValue = startTime;
    return () => {
      if ((Date.now() - startTimeValue) * 1000 > duration) {
        clearInterval(interVal);
      }
    };
  }, [data, duration, journeyStarted, startTime]);

  useEffect(() => {
    if (journeyStarted) {
      setStartTime(Date.now());
    }
  }, [journeyStarted]);

  if (isUpdating || passedTime > duration) {
    return (
      <>
        <EuiBadge>{IN_PROGRESS_LABEL}</EuiBadge>
        <EuiProgress size="xs" />
      </>
    );
  }

  return (
    <span>
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
    </span>
  );
};
