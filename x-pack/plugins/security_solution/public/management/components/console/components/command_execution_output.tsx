/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useMemo, useState } from 'react';
import { EuiLoadingChart } from '@elastic/eui';
import styled from 'styled-components';
import { UserCommandInput } from './user_command_input';
import { Command, CommandExecutionComponentProps } from '../types';
import { useConsoleStateDispatch } from '../hooks/state_selectors/use_console_state_dispatch';

const CommandOutputContainer = styled.div`
  position: relative;
`;

export interface CommandExecutionOutputProps {
  command: Command;
}
export const CommandExecutionOutput = memo<CommandExecutionOutputProps>(({ command }) => {
  const dispatch = useConsoleStateDispatch();
  const [commandStatus, setCommandStatus] =
    useState<CommandExecutionComponentProps['status']>('pending');
  const [commandStore, setCommandStore] = useState<CommandExecutionComponentProps['store']>({});
  const RenderComponent = command.commandDefinition.RenderComponent;

  const isRunning = useMemo(() => {
    return commandStatus === 'pending';
  }, [commandStatus]);

  useEffect(() => {
    if (!isRunning) {
      dispatch({ type: 'scrollDown' });
    }
  }, [isRunning, dispatch]);

  return (
    <CommandOutputContainer>
      <div>
        <UserCommandInput input={command.input} />
        {isRunning && (
          <>
            <EuiLoadingChart size="m" style={{ marginLeft: '0.5em' }} />
          </>
        )}
      </div>
      <div>
        <RenderComponent
          command={command}
          store={commandStore}
          status={commandStatus}
          setStore={setCommandStore}
          setStatus={setCommandStatus}
        />
      </div>
    </CommandOutputContainer>
  );
});
CommandExecutionOutput.displayName = 'CommandExecutionOutput';
