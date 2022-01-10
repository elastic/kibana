/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { useState } from 'react';
import { SyntheticsMonitor } from '../../../../common/runtime_types';
import { BrowserTestRunResult } from './browser/browser_test_results';
import { SimpleTestResults } from './simple/simple_test_results';

interface Props {
  monitorId: string;
  index: number;
  monitor: SyntheticsMonitor;
  device: string;
}
export const TestRunResult = ({ monitorId, monitor, index, device }: Props) => {
  const [refresh, setRefresh] = useState(Date.now());

  return monitor.type === 'browser' ? (
    <BrowserTestRunResult
      device={device}
      index={index}
      refresh={refresh}
      setRefresh={setRefresh}
      monitorId={monitorId}
    />
  ) : (
    <SimpleTestResults
      refresh={refresh}
      setRefresh={setRefresh}
      monitorId={monitorId}
      device={device}
      index={index}
      monitorType={monitor.type}
    />
  );
};
