/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode, useCallback, useEffect, useState } from 'react';
import { EuiButton, EuiLoadingChart } from '@elastic/eui';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { CommandExecutionFailure } from './command_execution_failure';
import { UserCommandInput } from './user_command_input';
import { Command } from '../types';
import { useCommandService } from '../hooks/state_selectors/use_command_service';
import { useConsoleStateDispatch } from '../hooks/state_selectors/use_console_state_dispatch';

const CommandOutputContainer = styled.div`
  position: relative;

  .run-in-background {
    position: absolute;
    right: 0;
    top: 1em;
  }
`;

export interface CommandExecutionOutputProps {
  command: Command;
}
export const CommandExecutionOutput = memo<CommandExecutionOutputProps>(({ command }) => {
  const commandService = useCommandService();
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [output, setOutput] = useState<ReactNode | null>(null);
  const dispatch = useConsoleStateDispatch();

  // FIXME:PT implement the `run in the background` functionality
  const [showRunInBackground, setShowRunInTheBackground] = useState(false);
  const handleRunInBackgroundClick = useCallback(() => {
    setShowRunInTheBackground(false);
  }, []);

  useEffect(() => {
    (async () => {
      const timeoutId = setTimeout(() => {
        setShowRunInTheBackground(true);
      }, 15000);

      try {
        const commandOutput = await commandService.executeCommand(command);
        setOutput(commandOutput.result);

        // FIXME: PT the console should scroll the bottom as well
      } catch (error) {
        setOutput(<CommandExecutionFailure error={error} />);
      }

      clearTimeout(timeoutId);
      setIsRunning(false);
      setShowRunInTheBackground(false);
    })();
  }, [command, commandService]);

  useEffect(() => {
    if (!isRunning) {
      dispatch({ type: 'scrollDown' });
    }
  }, [isRunning, dispatch]);

  return (
    <CommandOutputContainer>
      {showRunInBackground && (
        <div className="run-in-background">
          <EuiButton
            fill
            color="text"
            size="s"
            onClick={handleRunInBackgroundClick}
            title={i18n.translate(
              'xpack.securitySolution.console.commandOutput.runInBackgroundMsg',
              {
                defaultMessage:
                  'Command response is taking a bit long. Click here to run it in the background and be notified when a response is received',
              }
            )}
          >
            <FormattedMessage
              id="xpack.securitySolution.console.commandOutput.runInBackgroundButtonLabel"
              defaultMessage="Run in background"
            />
          </EuiButton>
        </div>
      )}
      <div>
        <UserCommandInput input={command.input} />
        {isRunning && (
          <>
            <EuiLoadingChart size="m" style={{ marginLeft: '0.5em' }} />
          </>
        )}
      </div>
      <div>{output}</div>
    </CommandOutputContainer>
  );
});
CommandExecutionOutput.displayName = 'CommandExecutionOutput';
