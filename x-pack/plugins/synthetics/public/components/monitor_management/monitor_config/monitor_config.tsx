/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';

import {
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyout,
  EuiSpacer,
  EuiFlyoutFooter,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { v4 as uuidv4 } from 'uuid';
import { defaultConfig, usePolicyConfigContext } from '../../fleet_package/contexts';

import { usePolicy } from '../../fleet_package/hooks/use_policy';
import { validate } from '../validation';
import { ActionBarPortal } from '../action_bar/action_bar_portal';
import { useFormatMonitor } from '../hooks/use_format_monitor';
import { MonitorFields } from './monitor_fields';
import { TestNowMode, TestRun } from '../test_now_mode/test_now_mode';
import { MonitorFields as MonitorFieldsType } from '../../../../common/runtime_types';

export const MonitorConfig = ({ isEdit = false }: { isEdit: boolean }) => {
  const { monitorType } = usePolicyConfigContext();

  /* raw policy config compatible with the UI. Save this to saved objects */
  const policyConfig = usePolicy();

  /* Policy config that heartbeat can read. Send this to the service.
     This type of helper should ideally be moved to task manager where we are syncing the config.
     We can process validation (isValid) and formatting for heartbeat (formattedMonitor) separately
     We don't need to save the heartbeat compatible version in saved objects */
  const { isValid, config } = useFormatMonitor({
    monitorType,
    validate,
    config: policyConfig[monitorType],
    defaultConfig: defaultConfig[monitorType],
  });

  const [hasBeenSubmitted, setHasBeenSubmitted] = useState(false);
  const [testRun, setTestRun] = useState<TestRun>();
  const [isTestRunInProgress, setIsTestRunInProgress] = useState<boolean>(false);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState<boolean>(false);

  const handleFormSubmit = () => {
    setHasBeenSubmitted(true);
  };

  const handleTestNow = () => {
    if (config) {
      setTestRun({ id: uuidv4(), monitor: config as MonitorFieldsType });
      setIsTestRunInProgress(true);
      setIsFlyoutOpen(true);
    }
  };

  const handleTestDone = useCallback(() => {
    setIsTestRunInProgress(false);
  }, [setIsTestRunInProgress]);

  const handleFlyoutClose = useCallback(() => {
    handleTestDone();
    setIsFlyoutOpen(false);
  }, [handleTestDone, setIsFlyoutOpen]);

  const flyout = isFlyoutOpen && config && (
    <EuiFlyout
      type="push"
      size="m"
      paddingSize="m"
      maxWidth="44%"
      aria-labelledby={TEST_RESULT}
      onClose={handleFlyoutClose}
    >
      <EuiFlyoutHeader>
        <EuiSpacer size="xl" />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <TestNowMode testRun={testRun} isMonitorSaved={isEdit} onDone={handleTestDone} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButtonEmpty iconType="cross" onClick={handleFlyoutClose} flush="left">
          {CLOSE_LABEL}
        </EuiButtonEmpty>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );

  return (
    <>
      <MonitorFields isFormSubmitted={hasBeenSubmitted} />

      {flyout}

      <ActionBarPortal
        monitor={policyConfig[monitorType]}
        isValid={isValid}
        onTestNow={handleTestNow}
        testRun={testRun}
        isTestRunInProgress={isTestRunInProgress}
        onSave={handleFormSubmit}
      />
    </>
  );
};

const TEST_RESULT = i18n.translate('xpack.uptime.monitorManagement.testResult', {
  defaultMessage: 'Test result',
});

const CLOSE_LABEL = i18n.translate('xpack.uptime.monitorManagement.closeButtonLabel', {
  defaultMessage: 'Close',
});
