/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode, useEffect, useState } from 'react';
import { EuiLoadingChart } from '@elastic/eui';
import { useConsoleService } from './console_provider';
import { Command } from '../service/console_service';
import { CommandExecutionFailure } from './command_execution_failure';
import { UserCommandInput } from './user_command_input';
import { useInternalServices } from './internal_context';

export interface CommandExecutionOutputProps {
  command: Command;
}
export const CommandExecutionOutput = memo<CommandExecutionOutputProps>(({ command }) => {
  const consoleService = useConsoleService();
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [output, setOutput] = useState<ReactNode | null>(null);
  const internalServices = useInternalServices();

  useEffect(() => {
    (async () => {
      try {
        const commandOutput = await consoleService.executeCommand(command);
        setOutput(commandOutput.result);

        // FIXME: PT the console should scroll the bottom as well
      } catch (error) {
        setOutput(<CommandExecutionFailure error={error} />);
      }
      setIsRunning(false);
    })();
  }, [command, consoleService]);

  useEffect(() => {
    if (!isRunning) {
      internalServices.scrollDown();
    }
  }, [isRunning, internalServices]);

  return (
    <div>
      <div>
        <UserCommandInput input={command.input} />
        {isRunning && (
          <>
            <EuiLoadingChart size="m" mono style={{ marginLeft: '0.5em' }} />
          </>
        )}
      </div>
      <div>{output}</div>
    </div>
  );
});
CommandExecutionOutput.displayName = 'CommandExecutionOutput';
