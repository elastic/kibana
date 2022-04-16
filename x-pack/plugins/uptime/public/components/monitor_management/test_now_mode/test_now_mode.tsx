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
import { TestRunResult } from './test_run_results';
import { MonitorFields } from '../../../../common/runtime_types';
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
        .then(() => setServiceError(null))
        .catch((error) => setServiceError(error));
    }
    return new Promise((resolve) => resolve(null));
  }, [testRun]);

  useEffect(() => {
    const errors = (data as { errors: Array<{ error: Error }> })?.errors;

    if (errors?.length > 0) {
      errors.forEach(({ error }) => {
        kibanaService.toasts.addError(error, { title: PushErrorLabel });
      });
    }
  }, [data]);

  const errors = (data as { errors?: Array<{ error: Error }> })?.errors;

  const hasErrors = serviceError || (errors && errors?.length > 0);

  useEffect(() => {
    if (!isPushing && (!testRun || hasErrors)) {
      onDone();
    }
  }, [testRun, hasErrors, isPushing, onDone]);

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

      {hasErrors && !isPushing && <EuiCallOut title={PushError} color="danger" iconType="alert" />}

      {testRun && !hasErrors && !isPushing && (
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem key={testRun.id}>
            <TestRunResult
              monitorId={testRun.id}
              monitor={testRun.monitor}
              isMonitorSaved={isMonitorSaved}
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

const PushError = i18n.translate('xpack.uptime.testRun.pushError', {
  defaultMessage: 'Failed to push the monitor to service.',
});

const PushErrorLabel = i18n.translate('xpack.uptime.testRun.pushErrorLabel', {
  defaultMessage: 'Push error',
});
