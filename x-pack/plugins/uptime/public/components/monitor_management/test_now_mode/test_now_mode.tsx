/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { useFetcher } from '@kbn/observability-plugin/public';
import { useRunOnceErrors } from '../hooks/use_run_once_errors';
import { TestRunResult } from './test_run_results';
import { MonitorFields, ServiceLocationErrors } from '../../../../common/runtime_types';
import { runOnceMonitor } from '../../../state/api';
import { kibanaService } from '../../../state/kibana_service';

export interface TestRun {
  id: string;
  monitor: MonitorFields;
}

export function TestNowMode({
  testRun,
  isMonitorSaved,
  onDone,
}: {
  testRun?: TestRun;
  isMonitorSaved: boolean;
  onDone: () => void;
}) {
  const [serviceError, setServiceError] = useState<null | Error>(null);

  const { data, loading: isPushing } = useFetcher(() => {
    if (testRun) {
      return runOnceMonitor({
        monitor: testRun.monitor,
        id: testRun.id,
      })
        .then((d) => {
          setServiceError(null);
          return d;
        })
        .catch((error) => setServiceError(error));
    }
    return new Promise((resolve) => resolve(null));
  }, [testRun]);

  const errors = (data as { errors?: ServiceLocationErrors })?.errors;

  const { hasBlockingError, blockingErrorMessage, expectPings, errorMessages } = useRunOnceErrors({
    testRunId: testRun?.id ?? '',
    serviceError,
    errors: errors ?? [],
    locations: testRun?.monitor.locations ?? [],
  });

  useEffect(() => {
    errorMessages.forEach(
      ({ name, message, title }: { name: string; message: string; title: string }) => {
        kibanaService.toasts.addError({ name, message }, { title });
      }
    );
  }, [errorMessages]);

  useEffect(() => {
    if (!isPushing && (!testRun || hasBlockingError)) {
      onDone();
    }
  }, [testRun, hasBlockingError, isPushing, onDone]);

  if (!testRun) {
    return null;
  }

  return (
    <EuiPanel color="subdued" hasBorder={true}>
      {isPushing && (
        <EuiCallOut color="primary">
          {PushingLabel} <EuiLoadingSpinner />
        </EuiCallOut>
      )}

      {(hasBlockingError && !isPushing && (
        <EuiCallOut title={blockingErrorMessage} color="danger" iconType="alert" />
      )) ||
        null}

      {testRun && !hasBlockingError && !isPushing && (
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem key={testRun.id}>
            <TestRunResult
              monitorId={testRun.id}
              monitor={testRun.monitor}
              isMonitorSaved={isMonitorSaved}
              expectPings={expectPings}
              onDone={onDone}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiSpacer size="xs" />
    </EuiPanel>
  );
}

const PushingLabel = i18n.translate('xpack.uptime.testRun.pushing.description', {
  defaultMessage: 'Pushing the monitor to service...',
});
