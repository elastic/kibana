/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiLoadingChart } from '@elastic/eui';
import styled from 'styled-components';
import type { CommandExecutionState, CommandHistoryItem } from './console_state/types';
import { UserCommandInput } from './user_command_input';
import { useConsoleStateDispatch } from '../hooks/state_selectors/use_console_state_dispatch';

const CommandOutputContainer = styled.div`
  position: relative;
`;

export interface CommandExecutionOutputProps {
  item: CommandHistoryItem;
}
export const CommandExecutionOutput = memo<CommandExecutionOutputProps>(
  ({ item: { command, state, id } }) => {
    const dispatch = useConsoleStateDispatch();
    const RenderComponent = command.commandDefinition.RenderComponent;

    const isRunning = useMemo(() => {
      return state.status === 'pending';
    }, [state.status]);

    /** Updates the Command's status */
    const setCommandStatus = useCallback(
      (status: CommandExecutionState['status']) => {
        dispatch({
          type: 'updateCommandStatusState',
          payload: {
            id,
            value: status,
          },
        });
      },
      [dispatch, id]
    );

    /** Updates the Command's execution store */
    const setCommandStore = useCallback(
      (store) => {
        dispatch({
          type: 'updateCommandStoreState',
          payload: {
            id,
            value: store,
          },
        });
      },
      [dispatch, id]
    );

    return (
      <CommandOutputContainer>
        <div>
          <UserCommandInput input={command.input} />
          {isRunning && <EuiLoadingChart size="m" style={{ marginLeft: '0.5em' }} />}
        </div>
        <div>
          <RenderComponent
            command={command}
            store={state.store}
            status={state.status}
            setStore={setCommandStore}
            setStatus={setCommandStatus}
          />
        </div>
      </CommandOutputContainer>
    );
  }
);
CommandExecutionOutput.displayName = 'CommandExecutionOutput';
