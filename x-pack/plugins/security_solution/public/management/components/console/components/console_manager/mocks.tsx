/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { ConsoleRegistrationInterface, RegisteredConsoleClient } from './types';
import { useConsoleManager } from './console_manager';
import { getCommandServiceMock } from '../../mocks';

export const getNewConsoleRegistrationMock = (
  overrides: Partial<ConsoleRegistrationInterface> = {}
): ConsoleRegistrationInterface => {
  return {
    id: Math.random().toString(36),
    title: 'Test console',
    meta: { about: 'for unit testing ' },
    consoleProps: {
      'data-test-subj': 'testRunningConsole',
      commandService: getCommandServiceMock(),
    },
    onBeforeTerminate: jest.fn(),
    ...overrides,
  };
};

const RunningConsole = memo<{ registeredConsole: RegisteredConsoleClient }>(
  ({ registeredConsole }) => {
    const handleShowOnClick = useCallback(() => {
      registeredConsole.show();
    }, [registeredConsole]);

    return (
      <div data-test-subj="runningConsole">
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow data-test-subj="runningConsoleTitle">
            {registeredConsole.title}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={handleShowOnClick} data-test-subj="showRunningConsole">
              {'show'}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
      </div>
    );
  }
);
RunningConsole.displayName = 'RunningConsole';

export const ConsoleManagerTestComponent = memo(() => {
  const consoleManager = useConsoleManager();
  const handleRegisterNewConsoleOnClick = useCallback(() => {
    consoleManager.register(getNewConsoleRegistrationMock());
  }, [consoleManager]);

  return (
    <div>
      <div>
        <EuiButton data-test-subj="registerNewConsole" onClick={handleRegisterNewConsoleOnClick}>
          {'Register and show new managed console'}
        </EuiButton>
      </div>
      <div>
        {consoleManager.getList().map((registeredConsole) => {
          return (
            <RunningConsole registeredConsole={registeredConsole} key={registeredConsole.id} />
          );
        })}
      </div>
    </div>
  );
});
ConsoleManagerTestComponent.displayName = 'ConsoleManagerTestComponent';
