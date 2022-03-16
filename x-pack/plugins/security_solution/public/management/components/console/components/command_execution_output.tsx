/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode, useCallback, useEffect, useState } from 'react';
import { EuiButton, EuiLoadingChart } from '@elastic/eui';
import styled from 'styled-components';
import { CommandExecutionFailure } from './command_execution_failure';
import { UserCommandInput } from './user_command_input';
import { useInternalServices } from './internal_context';
import { Command } from '../types';
import { useCommandService } from '../hooks/state_selectors/use_command_service';

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
  const consoleService = useCommandService();
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [output, setOutput] = useState<ReactNode | null>(null);
  const internalServices = useInternalServices();

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
        const commandOutput = await consoleService.executeCommand(command);
        setOutput(commandOutput.result);

        // FIXME: PT the console should scroll the bottom as well
      } catch (error) {
        setOutput(<CommandExecutionFailure error={error} />);
      }

      clearTimeout(timeoutId);
      setIsRunning(false);
      setShowRunInTheBackground(false);
    })();
  }, [command, consoleService]);

  useEffect(() => {
    if (!isRunning) {
      internalServices.scrollDown();
    }
  }, [isRunning, internalServices]);

  return (
    <CommandOutputContainer>
      {showRunInBackground && (
        <div className="run-in-background">
          <EuiButton
            fill
            color="text"
            size="s"
            onClick={handleRunInBackgroundClick}
            title="Command response is taking a bit long. Click here to run it in the background and be notified when a response is received"
          >
            {'Run in background'}
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
