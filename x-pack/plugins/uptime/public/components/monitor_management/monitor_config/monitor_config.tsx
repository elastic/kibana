/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { EuiResizableContainer } from '@elastic/eui';
import { v4 as uuidv4 } from 'uuid';
import { defaultConfig, usePolicyConfigContext } from '../../fleet_package/contexts';

import { usePolicy } from '../../fleet_package/hooks/use_policy';
import { validate } from '../validation';
import { ActionBarPortal } from '../action_bar/action_bar_portal';
import { useFormatMonitor } from '../hooks/use_format_monitor';
import { MonitorFields } from './monitor_fields';
import { TestNowMode, TestRun } from '../test_now_mode/test_now_mode';
import { MonitorFields as MonitorFieldsType } from '../../../../common/runtime_types';

export const MonitorConfig = () => {
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

  const [testRun, setTestRun] = useState<TestRun>();

  const onTestNow = () => {
    if (config) {
      setTestRun({ id: uuidv4(), monitor: config as MonitorFieldsType });
    }
  };

  return (
    <>
      <EuiResizableContainer>
        {(EuiResizablePanel, EuiResizableButton) => (
          <>
            <EuiResizablePanel
              initialSize={55}
              minSize="30%"
              mode={[
                'collapsible',
                {
                  position: 'top',
                },
              ]}
            >
              <MonitorFields />
            </EuiResizablePanel>

            <EuiResizableButton />

            <EuiResizablePanel initialSize={45} minSize="200px" mode="main">
              {config && <TestNowMode testRun={testRun} />}
            </EuiResizablePanel>
          </>
        )}
      </EuiResizableContainer>

      <ActionBarPortal
        monitor={policyConfig[monitorType]}
        isValid={isValid}
        onTestNow={onTestNow}
        testRun={testRun}
      />
    </>
  );
};
