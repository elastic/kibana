/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { useRunOnceErrors } from '../hooks/use_run_once_errors';
import { ManualTestRun } from '../../../state/manual_test_runs';
import { BrowserTestRunResult } from './browser_test_results';
import { SimpleTestResults } from './simple_test_results';
import { Locations } from '../../../../../../common/runtime_types';

export function ManualTestRunMode({
  manualTestRun,
  onDone,
  showErrors,
}: {
  showErrors: boolean;
  manualTestRun: ManualTestRun;
  onDone: (testRunId: string) => void;
}) {
  const { expectPings } = useRunOnceErrors({
    showErrors,
    testRunId: manualTestRun.testRunId!,
    locations: (manualTestRun.monitor!.locations ?? []) as Locations,
    errors: manualTestRun.errors ?? [],
  });

  if (!manualTestRun.testRunId || !manualTestRun.monitor) return null;

  const isBrowserMonitor = manualTestRun.monitor.type === 'browser';

  return (
    <Fragment key={manualTestRun.testRunId}>
      {isBrowserMonitor ? (
        <BrowserTestRunResult
          expectPings={expectPings}
          onDone={onDone}
          testRunId={manualTestRun.testRunId}
          onProgress={() => {}}
        />
      ) : (
        <SimpleTestResults
          expectPings={expectPings}
          onDone={onDone}
          testRunId={manualTestRun.testRunId}
        />
      )}
    </Fragment>
  );
}
