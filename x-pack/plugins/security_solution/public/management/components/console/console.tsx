/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useRef } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import styled from 'styled-components';
import { HistoryOutput } from './components/history_output';
import { CommandInput, CommandInputProps } from './components/command_input';
import { ConsoleProps } from './types';
import { ConsoleStateProvider } from './components/console_state';
import { useTestIdGenerator } from '../hooks/use_test_id_generator';
import { useWithManagedConsole } from './components/console_manager/console_manager';

// FIXME:PT implement dark mode for the console or light mode switch

const ConsoleWindow = styled.div`
  height: 100%;

  // FIXME: IMPORTANT - this should NOT be used in production
  // dark mode on light theme / light mode on dark theme
  filter: invert(100%);

  .ui-panel {
    min-width: ${({ theme }) => theme.eui.euiBreakpoints.s};
    height: 100%;
    min-height: 300px;
    overflow-y: auto;
  }

  .descriptionList-20_80 {
    &.euiDescriptionList {
      > .euiDescriptionList__title {
        width: 20%;
      }

      > .euiDescriptionList__description {
        width: 80%;
      }
    }
  }
`;

export const Console = memo<ConsoleProps>(
  ({ prompt, commands, HelpComponent, managedKey, ...commonProps }) => {
    const consoleWindowRef = useRef<HTMLDivElement | null>(null);
    const inputFocusRef: CommandInputProps['focusRef'] = useRef(null);
    const getTestId = useTestIdGenerator(commonProps['data-test-subj']);
    const managedConsole = useWithManagedConsole(managedKey);

    const scrollToBottom = useCallback(() => {
      // We need the `setTimeout` here because in some cases, the command output
      // will take a bit of time to populate its content due to the use of Promises
      setTimeout(() => {
        if (consoleWindowRef.current) {
          consoleWindowRef.current.scrollTop = consoleWindowRef.current.scrollHeight;
        }
      }, 1);

      // NOTE: its IMPORTANT that this callback does NOT have any dependencies, because
      // it is stored in State and currently not updated if it changes
    }, []);

    const handleConsoleClick = useCallback(() => {
      if (inputFocusRef.current) {
        inputFocusRef.current();
      }
    }, []);

    return (
      <ConsoleStateProvider
        commands={commands}
        scrollToBottom={scrollToBottom}
        HelpComponent={HelpComponent}
        dataTestSubj={commonProps['data-test-subj']}
      >
        {/*
          If this is a managed console, then we only show its content if it is open.
          The state provider, however, continues to be rendered so that as updates to pending
          commands are received, those will still make it to the console's state and be
          shown when the console is eventually opened again.
        */}
        {!managedConsole || managedConsole.isOpen ? (
          <ConsoleWindow onClick={handleConsoleClick} {...commonProps}>
            <EuiPanel
              className="ui-panel"
              panelRef={consoleWindowRef}
              data-test-subj={getTestId('mainPanel')}
            >
              <EuiFlexGroup direction="column">
                <EuiFlexItem grow={true}>
                  <HistoryOutput />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <CommandInput prompt={prompt} focusRef={inputFocusRef} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </ConsoleWindow>
        ) : null}
      </ConsoleStateProvider>
    );
  }
);

Console.displayName = 'Console';
