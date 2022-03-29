/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
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
import { Locations, MonitorFields } from '../../../../common/runtime_types';
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

  const locationsById: Record<string, Locations[number]> = useMemo(
    () =>
      ((testRun?.monitor.locations ?? []) as Locations).reduce(
        (acc, cur) => ({ ...acc, [cur.id]: cur }),
        {}
      ),
    [testRun?.monitor.locations]
  );

  const errors = (data as { errors?: Array<{ locationId: string }> })?.errors;
  const expectPings = !!testRun ? testRun.monitor.locations.length - (errors?.length ?? 0) : 0;

  const hasBlockingError =
    serviceError || (errors && errors?.length === testRun?.monitor.locations.length);

  useEffect(() => {
    if (errors) {
      if (hasBlockingError) {
        kibanaService.toasts.addError(
          { name: 'Error', message: PushErrorService },
          { title: PushErrorLabel }
        );
      } else if (errors?.length > 0) {
        // If only some of the locations were unsuccessful
        errors
          .map(({ locationId }) => locationsById[locationId])
          .filter((location) => !!location)
          .forEach((location) => {
            kibanaService.toasts.addError(
              { name: 'Error', message: getLocationTestErrorLabel(location.label) },
              { title: RunErrorLabel }
            );
          });
      }
    }
  }, [locationsById, errors, hasBlockingError]);

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

      {hasBlockingError && !isPushing && (
        <EuiCallOut title={PushErrorService} color="danger" iconType="alert" />
      )}

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

const PushErrorLabel = i18n.translate('xpack.uptime.testRun.pushErrorLabel', {
  defaultMessage: 'Push error',
});

const PushErrorService = i18n.translate('xpack.uptime.testRun.pushError', {
  defaultMessage: 'Failed to push the monitor to service.',
});

const RunErrorLabel = i18n.translate('xpack.uptime.testRun.runErrorLabel', {
  defaultMessage: 'Error running test',
});

const getLocationTestErrorLabel = (locationName: string) =>
  i18n.translate('xpack.uptime.testRun.runErrorLocation', {
    defaultMessage: 'Failed to run monitor on location {locationName}.',
    values: { locationName },
  });
