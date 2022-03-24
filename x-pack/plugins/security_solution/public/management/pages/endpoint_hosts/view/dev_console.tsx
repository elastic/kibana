/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import {
  EuiButton,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useUrlParams } from '../../../components/hooks/use_url_params';
import {
  Command,
  CommandDefinition,
  CommandServiceInterface,
  Console,
  RegisteredConsoleClient,
  useConsoleManager,
} from '../../../components/console';

const delay = async (ms: number = 4000) => new Promise((r) => setTimeout(r, ms));

class DevCommandService implements CommandServiceInterface {
  getCommandList(): CommandDefinition[] {
    return [
      {
        name: 'cmd1',
        about: 'Runs cmd1',
      },
      {
        name: 'cmd2',
        about: 'runs cmd 2',
        args: {
          file: {
            required: true,
            allowMultiples: false,
            about: 'Includes file in the run',
            validate: () => {
              return true;
            },
          },
          bad: {
            required: false,
            allowMultiples: false,
            about: 'will fail validation',
            validate: () => 'This is a bad value',
          },
        },
      },
      {
        name: 'cmd-long-delay',
        about: 'runs cmd 2',
      },
    ];
  }

  async executeCommand(command: Command): Promise<{ result: React.ReactNode }> {
    await delay();

    if (command.commandDefinition.name === 'cmd-long-delay') {
      await delay(20000);
    }

    return {
      result: (
        <div>
          <div>{`${command.commandDefinition.name}`}</div>
          <div>{`command input: ${command.input}`}</div>
          <EuiCode>{JSON.stringify(command.args, null, 2)}</EuiCode>
        </div>
      ),
    };
  }
}

const RunningConsole = memo<{ registeredConsole: RegisteredConsoleClient }>(
  ({ registeredConsole }) => {
    const handleShowOnClick = useCallback(() => {
      registeredConsole.show();
    }, [registeredConsole]);

    const handleTerminateOnClick = useCallback(() => {
      registeredConsole.terminate();
    }, [registeredConsole]);

    return (
      <>
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow>{registeredConsole.title}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <EuiButton onClick={handleTerminateOnClick} color="danger">
                  {'terminate'}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButton onClick={handleShowOnClick}>{'show'}</EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
      </>
    );
  }
);
RunningConsole.displayName = 'RunningConsole';

// ------------------------------------------------------------
// FOR DEV PURPOSES ONLY
// FIXME:PT Delete once we have support via row actions menu
// ------------------------------------------------------------
export const DevConsole = memo(() => {
  const isConsoleEnabled = useIsExperimentalFeatureEnabled('responseActionsConsoleEnabled');
  const consoleManager = useConsoleManager();
  const commandService = useMemo(() => {
    return new DevCommandService();
  }, []);

  const handleOnClick = useCallback(() => {
    consoleManager
      .register({
        id: Math.random().toString(36),
        title: 'Test console here',
        consoleProps: {
          prompt: '>>',
          commandService,
        },
      })
      .show();
  }, [commandService, consoleManager]);

  const {
    urlParams: { showConsole = false },
  } = useUrlParams();

  return isConsoleEnabled && showConsole ? (
    <EuiPanel>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton onClick={handleOnClick}>{'Open a managed console'}</EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow>
          {consoleManager.getList().map((registeredConsole) => (
            <RunningConsole key={registeredConsole.id} registeredConsole={registeredConsole} />
          ))}
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="xxl" />

      <EuiText>
        <h3>{'Un-managed console'}</h3>
      </EuiText>
      <EuiPanel>
        <Console prompt="$$>" commandService={commandService} data-test-subj="dev" />
      </EuiPanel>
    </EuiPanel>
  ) : null;
});
DevConsole.displayName = 'DevConsole';
