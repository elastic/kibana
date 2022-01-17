/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { v4 as uuidv4 } from 'uuid';
import { TestRunResult } from './test_run_results';
import { MonitorFields } from '../../../../common/runtime_types';
import { useFetcher } from '../../../../../observability/public';
import { runOnceMonitor } from '../../../state/api';
import { kibanaService } from '../../../state/kibana_service';

export interface TestRun {
  id: string;
  monitor: MonitorFields;
}

export function TestNowMode({ monitor }: { monitor?: MonitorFields }) {
  const [testRun, setTestRun] = useState<TestRun>();

  const startTestRun = () => {
    if (monitor) {
      setTestRun({ id: uuidv4(), monitor });
    }
  };

  const { data, loading: isPushing } = useFetcher(() => {
    if (testRun) {
      return runOnceMonitor({
        monitor: testRun.monitor,
        id: testRun.id,
      });
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

  const btnContent = <EuiButtonEmpty iconType="controlsHorizontal">{TestNowLabel}</EuiButtonEmpty>;

  const errors = (data as { errors?: Array<{ error: Error }> })?.errors;

  const hasErrors = errors && errors?.length > 0;

  const content = (
    <EuiPanel color="subdued" hasBorder={true}>
      <EuiText>{DescriptionLabel}</EuiText>
      <EuiSpacer />

      {isPushing && <EuiText>{PushingLabel}</EuiText>}

      {hasErrors && !isPushing && <EuiCallOut title={PushError} color="danger" iconType="alert" />}

      {testRun && !hasErrors && !isPushing && (
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem key={testRun.id}>
            <TestRunResult monitorId={testRun.id} monitor={testRun.monitor} />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiSpacer size="xs" />
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton onClick={startTestRun} isDisabled={!monitor} size="s" isLoading={isPushing}>
            {testRun ? UpdateTestRunLabel : StartTestRunLabel}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );

  return (
    <EuiAccordion id={'simpleAccordionId'} buttonContent={btnContent} arrowDisplay="right">
      {content}
    </EuiAccordion>
  );
}

const TestNowLabel = i18n.translate('xpack.uptime.testNow.label', {
  defaultMessage: 'Test now',
});

const StartTestRunLabel = i18n.translate('xpack.uptime.startTestRun.label', {
  defaultMessage: 'Start test run',
});

const UpdateTestRunLabel = i18n.translate('xpack.uptime.updateTestRun.label', {
  defaultMessage: 'Update test run',
});

const DescriptionLabel = i18n.translate('xpack.uptime.testRun.description', {
  defaultMessage: 'Test your monitor and verify the results before saving',
});

const PushingLabel = i18n.translate('xpack.uptime.testRun.description', {
  defaultMessage: 'Pushing the monitor to service...',
});

const PushError = i18n.translate('xpack.uptime.testRun.pushError', {
  defaultMessage: 'Failed to push the monitor to service.',
});

const PushErrorLabel = i18n.translate('xpack.uptime.testRun.pushErrorLabel', {
  defaultMessage: 'Push error',
});
