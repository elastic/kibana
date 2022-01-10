/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { v4 as uuidv4 } from 'uuid';
import { TestDevices } from './test_devices';
import { TestRunResult } from './test_run_results';
import { ConfigKey, MonitorFields } from '../../../../common/runtime_types';
import { useFetcher } from '../../../../../observability/public';
import { runOnceMonitor } from '../../../state/api';
import { FlakyTestResults } from './flaky_mode/flaky_test_results';

const iphone13 = {
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1',
  screen: {
    width: 390,
    height: 844,
  },
  viewport: {
    width: 390,
    height: 664,
  },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  defaultBrowserType: 'webkit',
};
const iPadPro11 = {
  userAgent:
    'Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1',
  viewport: {
    width: 834,
    height: 1194,
  },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  defaultBrowserType: 'webkit',
};

const getDeviceArgs = (device: string, monitor: MonitorFields) => {
  const currArgs = monitor[ConfigKey.SYNTHETICS_ARGS] ?? [];
  if (device === 'laptop') {
    return currArgs;
  }
  if (device === 'tablet') {
    return [...currArgs, '--playwright-options', JSON.stringify(iPadPro11)];
  }
  return [...currArgs, '--playwright-options', JSON.stringify(iphone13)];
};

export interface TestRun {
  id: string;
  devices: string[];
  monitor: MonitorFields;
  status: 'started' | 'in-progress' | 'pending' | 'completed';
}

export function Playground({
  monitor,
  selectedSessionId,
  flakyCount = 0,
  testRuns = [],
  testDevices = [],
  setTestRuns,
  setTestDevices,
  useAccordion = true,
}: {
  monitor?: MonitorFields;
  useAccordion?: boolean;
  flakyCount?: number;
  selectedSessionId: string;
  testRuns: TestRun[];
  testDevices: string[];
  setTestRuns: (val: TestRun[]) => void;
  setTestDevices: (val: string[]) => void;
}) {
  const startTestRun = () => {
    if (monitor) {
      if (flakyCount > 0) {
        const tRuns: TestRun[] = [];
        for (let i = 0; i < flakyCount; i++) {
          tRuns.push({ id: uuidv4(), devices: testDevices, monitor, status: 'pending' });
        }
        setTestRuns([...tRuns, ...testRuns]);
      } else {
        setTestRuns([
          { id: uuidv4(), devices: testDevices, monitor, status: 'pending' },
          ...testRuns,
        ]);
      }
    }
  };

  useFetcher(() => {
    const pendingTestRuns = testRuns.filter(({ status }) => status === 'pending');
    pendingTestRuns.forEach((testRun) => {
      testRun.devices.forEach((device) => {
        runOnceMonitor({
          monitor: {
            ...testRun.monitor,
            [ConfigKey.SYNTHETICS_ARGS]: getDeviceArgs(device, testRun.monitor),
          },
          id: testRun.id + device,
        });
      });
    });
    if (pendingTestRuns.length > 0) {
      setTestRuns(pendingTestRuns.map((tRun) => ({ ...tRun, status: 'started' })));
    }
  }, [testRuns]);

  const btnContent = (
    <EuiButtonEmpty iconType="controlsHorizontal">{PlaygroundLabel}</EuiButtonEmpty>
  );

  const content = (
    <EuiPanel color="subdued" hasBorder={true}>
      <EuiText>Test your monitor and verify the results before saving.</EuiText>
      <EuiSpacer />
      {monitor?.type === 'browser' && (
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiText>Devices to emulate:</EuiText>
            <TestDevices setTestDevices={setTestDevices} testDevices={testDevices} />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      {flakyCount > 0 && testRuns.length > 0 ? (
        <FlakyTestResults testRuns={testRuns} monitorType={monitor?.type!} />
      ) : (
        <EuiFlexGroup direction="column" gutterSize="xs">
          {testRuns.map((testRun, index) => (
            <>
              {testRun.devices.map((device) => (
                <EuiFlexItem key={testRun.id + index + device}>
                  <TestRunResult
                    monitorId={testRun.id + device}
                    monitor={{
                      ...testRun.monitor,
                      [ConfigKey.SYNTHETICS_ARGS]: getDeviceArgs(device, testRun.monitor),
                    }}
                    index={index + 1}
                    device={device}
                  />
                </EuiFlexItem>
              ))}
            </>
          ))}
        </EuiFlexGroup>
      )}
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton onClick={startTestRun} isDisabled={!monitor}>
            Start test run
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );

  if (!useAccordion) {
    return <>{content}</>;
  }

  return (
    <EuiAccordion id={'simpleAccordionId'} buttonContent={btnContent} arrowDisplay="right">
      {content}
    </EuiAccordion>
  );
}

const PlaygroundLabel = i18n.translate('xpack.uptime.playground.label', {
  defaultMessage: 'Playground',
});
