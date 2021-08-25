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

export interface CommandExecutionOutputProps {
  command: Command;
}
export const CommandExecutionOutput = memo<CommandExecutionOutputProps>(({ command }) => {
  const consoleService = useConsoleService();
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [output, setOutput] = useState<ReactNode | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const commandOutput = await consoleService.executeCommand(command);
        setOutput(commandOutput.result);
      } catch (error) {
        setOutput(<CommandExecutionFailure error={error} />);
      }
      setIsRunning(false);
    })();
  }, []);

  return (
    <div>
      <UserCommandInput input={command.input} />
      {isRunning && (
        <>
          <EuiLoadingChart size="m" mono style={{ marginLeft: '0.5em' }} />
        </>
      )}
      {output}
    </div>
  );
});
CommandExecutionOutput.displayName = 'CommandExecutionOutput';
