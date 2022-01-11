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
  monitor: SyntheticsMonitor;
}
export const TestRunResult = ({ monitorId, monitor }: Props) => {
  const [refresh, setRefresh] = useState(Date.now());

  return monitor.type === 'browser' ? (
    <BrowserTestRunResult refresh={refresh} setRefresh={setRefresh} monitorId={monitorId} />
  ) : (
    <SimpleTestResults refresh={refresh} setRefresh={setRefresh} monitorId={monitorId} />
  );
};
