/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import styled from 'styled-components';
import { OutputHistory } from './components/output_history';
import { CommandInput, CommandInputProps } from './components/command_input';
import { EuiThemeProvider } from '../../../../../../../src/plugins/kibana_react/common';
import { useConsoleService } from './components/console_provider';
import { HistoryItemComponent, HistoryItem } from './components/history_item';

// FIXME:PT implement dark mode for the console

const ConsoleWindow = styled(EuiPanel)`
  min-width: ${({ theme }) => theme.eui.euiBreakpoints.s};
  min-height: 300px;
  max-height: 100%;
  overflow-y: auto;

  background-color: ${({ theme }) => theme.eui.euiCodeBlockBackgroundColor} !important;
  color: ${({ theme }) => theme.eui.euiCodeBlockColor} !important;
`;

// FIXME: PT add CommonProps to the type below
// FIXME:PT adjust list of exposed props
export type ConsoleProps = Pick<CommandInputProps, 'prompt'>;

export const Console = memo<ConsoleProps>(({ prompt }) => {
  // TODO:PT Think about how much of this is driven by props -vs- the `ConsoleProvider` context

  const consoleService = useConsoleService();
  const [historyItems, setHistoryItems] = useState<HistoryItemComponent[]>([]);
  const consoleWindowRef = useRef<HTMLDivElement | null>(null);

  const handleOnExecute = useCallback<CommandInputProps['onExecute']>(
    (command) => {
      // FIXME:PT Most of these can just be static functions of sub-components so that nearly no logic lives here

      if (command.name === 'help') {
        let helpOutput: ReactNode;

        if (consoleService.getHelp) {
          helpOutput = consoleService.getHelp();
        } else {
          helpOutput = (
            <p>
              {'The following commands are available:'}
              <EuiSpacer />
              {consoleService.getCommandList().map((commandDefinition) => {
                return <div>{`${commandDefinition.name} - ${commandDefinition.about}`}</div>;
              })}
              <EuiSpacer />
            </p>
          );
        }

        setHistoryItems((prevState) => {
          return [...prevState, <HistoryItem>{helpOutput}</HistoryItem>];
        });

        return;
      }

      const commandDefinition = consoleService
        .getCommandList()
        .find((definition) => definition.name === command.name);

      if (!commandDefinition) {
        setHistoryItems((prevState) => {
          return [...prevState, <HistoryItem>{`unknown command: ${command.input}`}</HistoryItem>];
        });
      }
    },
    [consoleService]
  );

  // Anytime we add a new item to the history, scroll down so that command input remains visible
  useEffect(() => {
    if (historyItems.length && consoleWindowRef.current) {
      consoleWindowRef.current.scrollTop = consoleWindowRef.current.scrollHeight;
    }
  }, [historyItems.length]);

  return (
    <EuiThemeProvider darkMode={true}>
      <ConsoleWindow panelRef={consoleWindowRef}>
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={true}>
            <OutputHistory>{historyItems}</OutputHistory>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <CommandInput onExecute={handleOnExecute} prompt={prompt} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </ConsoleWindow>
    </EuiThemeProvider>
  );
});

Console.displayName = 'Console';
