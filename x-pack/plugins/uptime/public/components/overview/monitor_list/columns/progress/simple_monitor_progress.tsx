/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiProgress } from '@elastic/eui';
import React, { useEffect, useRef, useState } from 'react';
import { useSimpleRunOnceMonitors } from '../../../../monitor_management/test_now_mode/simple/use_simple_run_once_monitors';
import { IN_PROGRESS_LABEL } from '../../../../monitor_management/test_now_mode/test_result_header';

export const SimpleMonitorProgress = ({
  monitorId,
  testRunId,
  duration,
  isUpdating,
  updateMonitorStatus,
}: {
  monitorId: string;
  testRunId: string;
  duration: number;
  isUpdating: boolean;
  updateMonitorStatus: () => void;
}) => {
  const { summaryDoc, data } = useSimpleRunOnceMonitors({
    configId: monitorId,
    testRunId,
  });

  const startTime = useRef(Date.now());

  const [passedTime, setPassedTime] = useState(Date.now());

  useEffect(() => {
    if (summaryDoc) {
      updateMonitorStatus();
    }
  }, [updateMonitorStatus, summaryDoc]);

  useEffect(() => {
    setPassedTime(Date.now() - startTime.current);
  }, [data]);

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
    <span>
      <EuiBadge>{IN_PROGRESS_LABEL}</EuiBadge>
      <EuiProgress value={passedTimeMicro} max={duration} size="xs" />
    </span>
  );
};
