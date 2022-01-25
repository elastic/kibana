/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiProgress } from '@elastic/eui';
import React, { useEffect, useRef, useState } from 'react';
import { useSimpleRunOnceMonitors } from '../../../../monitor_management/test_now_mode/simple/use_simple_run_once_monitors';

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

  if (isUpdating) {
    return (
      <>
        <EuiBadge>UPDATING</EuiBadge>
        <EuiProgress size="xs" />
      </>
    );
  }

  return (
    <span>
      <EuiBadge>IN PROGRESS</EuiBadge>
      <EuiProgress value={passedTime * 1000} max={duration} size="xs" />
    </span>
  );
};
