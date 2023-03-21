/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import { useRunOnceErrors } from './hooks/use_run_once_errors';
import { BrowserTestRunResult } from './browser/browser_test_results';
import { TestRun } from './test_now_mode_flyout';
import { SimpleTestResults } from './simple/simple_test_results';
import { Locations, ServiceLocationErrors } from '../../../../../common/runtime_types';

export function TestNowMode({
  testRun,
  onDone,
  isPushing,
  serviceError,
  errors,
}: {
  serviceError?: Error;
  errors: ServiceLocationErrors;
  isPushing: boolean;
  testRun: TestRun;
  onDone: (testRunId: string) => void;
}) {
  const { hasBlockingError, blockingErrorMessage, expectPings } = useRunOnceErrors({
    testRunId: testRun.id,
    serviceError,
    errors: errors ?? [],
    locations: (testRun.monitor.locations ?? []) as Locations,
  });

  useEffect(() => {
    if (!isPushing && (!testRun.id || hasBlockingError)) {
      onDone(testRun.id);
    }
    // we don't need onDone as a dependency since it's a function
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testRun.id, hasBlockingError, isPushing]);

  const isBrowserMonitor = testRun.monitor.type === 'browser';

  return (
    <EuiPanel color="subdued" hasBorder={true}>
      {(hasBlockingError && !isPushing && (
        <EuiCallOut title={blockingErrorMessage} color="danger" iconType="alert" />
      )) ||
        null}

      {testRun && !hasBlockingError && !isPushing && (
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem key={testRun.id}>
            {isBrowserMonitor ? (
              <BrowserTestRunResult
                expectPings={expectPings}
                onDone={onDone}
                testRunId={testRun.id}
              />
            ) : (
              <SimpleTestResults expectPings={expectPings} onDone={onDone} testRunId={testRun.id} />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiSpacer size="xs" />
    </EuiPanel>
  );
}
