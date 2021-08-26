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
import { useConsoleService } from './components/console_provider';
import { HistoryItemComponent, HistoryItem } from './components/history_item';
import { HelpOutput } from './components/help_output';
import { UnknownCommand } from './components/unknow_comand';
import { CommandExecutionOutput } from './components/command_execution_output';
import { parseCommandInput } from './service/parsed_command_input';
import { BadArgument } from './components/bad_argument';

// FIXME:PT implement dark mode for the console or light mode switch

const ConsoleWindow = styled(EuiPanel)`
  min-width: ${({ theme }) => theme.eui.euiBreakpoints.s};
  min-height: 300px;
  max-height: 100%;
  overflow-y: auto;

  // FIXME: IMPORTANT - this should NOT be used in production
  // dark mode on light theme / light mode on dark theme
  filter: invert(100%);
`;

// FIXME: PT add CommonProps to the type below
// FIXME:PT adjust list of exposed props
export type ConsoleProps = Pick<CommandInputProps, 'prompt'>;

export const Console = memo<ConsoleProps>(({ prompt }) => {
  // TODO:PT Think about how much of this is driven by props -vs- the `ConsoleProvider` context

  const consoleService = useConsoleService();
  const [historyItems, setHistoryItems] = useState<HistoryItemComponent[]>([]);
  const consoleWindowRef = useRef<HTMLDivElement | null>(null);
  const inputFocusRef: CommandInputProps['focusRef'] = useRef(null);

  const handleConsoleClick = useCallback(() => {
    if (inputFocusRef.current) {
      inputFocusRef.current();
    }
  }, []);

  const handleOnExecute = useCallback<CommandInputProps['onExecute']>(
    (commandInput) => {
      // FIXME:PT Most of these can just be static functions of sub-components so that nearly no logic lives here

      const parsedInput = parseCommandInput(commandInput.input);

      if (parsedInput.name === '') {
        return;
      }

      // FIXME:PT create list of default console commands and allow user to override them
      //      should include things like:
      //        - clear
      //        - help
      //        - exit
      if (parsedInput.name === 'help') {
        // FIXME:PT This should just be a list of `CommandDefinition` that the console supports by default

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
          return [
            ...prevState,
            <HistoryItem>
              <HelpOutput input={parsedInput.input}>{helpOutput}</HelpOutput>
            </HistoryItem>,
          ];
        });

        return;
      }

      if (parsedInput.name === 'clear') {
        // FIXME:PT This should just be a list of `CommandDefinition` that the console supports by default
        setHistoryItems([]);
        return;
      }

      const commandDefinition = consoleService
        .getCommandList()
        .find((definition) => definition.name === parsedInput.name);

      if (!commandDefinition) {
        setHistoryItems((prevState) => {
          return [
            ...prevState,
            <HistoryItem>
              <UnknownCommand input={parsedInput.input} />
            </HistoryItem>,
          ];
        });
        return;
      }

      // FIXME:PT Implement support for a `--help` built in argument for all commands
      //        This Would output the help for only that command (usage ++ description of each argument)

      // If args were entered, then validate them
      if (parsedInput.hasArgs()) {
        if (!commandDefinition.args) {
          setHistoryItems((prevState) => {
            return [
              ...prevState,
              <HistoryItem>
                <BadArgument parsedInput={parsedInput} commandDefinition={commandDefinition}>
                  {'command does not support any arguments'}
                </BadArgument>
              </HistoryItem>,
            ];
          });

          return;
        }

        // unknown arguments?
        if (parsedInput.unknownArgs && parsedInput.unknownArgs.length) {
          setHistoryItems((prevState) => {
            return [
              ...prevState,
              <HistoryItem>
                <BadArgument parsedInput={parsedInput} commandDefinition={commandDefinition}>
                  {`unknown argument(s): ${parsedInput.unknownArgs.join(', ')}`}
                </BadArgument>
              </HistoryItem>,
            ];
          });

          return;
        }

        // unsupported arguments
        for (const argName of Object.keys(parsedInput.args)) {
          if (!commandDefinition.args[argName]) {
            setHistoryItems((prevState) => {
              return [
                ...prevState,
                <HistoryItem>
                  <BadArgument parsedInput={parsedInput} commandDefinition={commandDefinition}>
                    {`unsupported argument: ${argName}`}
                  </BadArgument>
                </HistoryItem>,
              ];
            });

            return;
          }

          // FIXME:PT implement validation of arguments `allowMultiples`

          // FIXME:PT implement validation of required arguments

          // FIXME:PT Implement calling validator
        }
      } else if (commandDefinition.mustHaveArgs) {
        setHistoryItems((prevState) => {
          return [
            ...prevState,
            <HistoryItem>
              <BadArgument parsedInput={parsedInput} commandDefinition={commandDefinition}>
                {'at least 1 argument must be used'}
              </BadArgument>
            </HistoryItem>,
          ];
        });

        return;
      }

      setHistoryItems((prevState) => {
        return [
          ...prevState,
          <HistoryItem>
            <CommandExecutionOutput
              command={{
                input: parsedInput.input,
                args: parsedInput,
                commandDefinition,
              }}
            />
          </HistoryItem>,
        ];
      });
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
    <div onClick={handleConsoleClick}>
      <ConsoleWindow panelRef={consoleWindowRef}>
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={true}>
            <OutputHistory>{historyItems}</OutputHistory>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <CommandInput onExecute={handleOnExecute} prompt={prompt} focusRef={inputFocusRef} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </ConsoleWindow>
    </div>
  );
});

Console.displayName = 'Console';
