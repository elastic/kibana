/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import styled from 'styled-components';
import { OutputHistory } from './components/output_history';
import { CommandInput, CommandInputProps } from './components/command_input';
import { HistoryItemComponent, HistoryItem } from './components/history_item';
import { HelpOutput } from './components/help_output';
import { UnknownCommand } from './components/unknow_comand';
import { CommandExecutionOutput } from './components/command_execution_output';
import { parseCommandInput } from './service/parsed_command_input';
import { BadArgument } from './components/bad_argument';
import { ConsoleBuiltinCommandsService } from './builtins/builtin_command_service';
import { ConsoleInternalContext, InternalServices } from './components/internal_context';
import { CommandServiceInterface } from './types';
import { ConsoleStateProvider } from './components/console_state';

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

export interface ConsoleProps extends Pick<CommandInputProps, 'prompt'> {
  consoleService: CommandServiceInterface;
}

export const Console = memo<ConsoleProps>(({ prompt, consoleService }) => {
  const [builtinCommandService] = useState(new ConsoleBuiltinCommandsService());
  const [historyItems, setHistoryItems] = useState<HistoryItemComponent[]>([]);
  const consoleWindowRef = useRef<HTMLDivElement | null>(null);
  const inputFocusRef: CommandInputProps['focusRef'] = useRef(null);

  const scrollToBottom = useCallback(() => {
    // FIXME:PT avoid setTimeout()
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

  const handleOnExecute = useCallback<CommandInputProps['onExecute']>(
    (commandInput) => {
      // FIXME:PT Most of these can just be static functions of sub-components so that nearly no logic lives here

      const parsedInput = parseCommandInput(commandInput.input);

      if (parsedInput.name === '') {
        return;
      }

      // Is it an internal command?
      if (builtinCommandService.isBuiltin(parsedInput.name)) {
        const commandOutput = builtinCommandService.executeBuiltinCommand(
          parsedInput,
          consoleService
        );

        if (commandOutput.clearBuffer) {
          setHistoryItems([]);
        } else {
          setHistoryItems((prevState) => {
            return [...prevState, commandOutput.result];
          });
        }

        return;
      }

      // Validate and execute the defined command

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

      // FIXME: the validation checks below should be lifted and centralized so that they can be reused (in builtinCommands)

      // If args were entered, then validate them
      if (parsedInput.hasArgs()) {
        if (parsedInput.hasArg('help')) {
          setHistoryItems((prevState) => {
            return [
              ...prevState,
              <HistoryItem>
                <HelpOutput input={parsedInput.input} title={`${parsedInput.name} command`}>
                  {(consoleService.getCommandUsage || builtinCommandService.getCommandUsage)(
                    commandDefinition
                  )}
                </HelpOutput>
              </HistoryItem>,
            ];
          });

          return;
        }

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
    [builtinCommandService, consoleService]
  );

  const internalServices: InternalServices = useMemo(() => {
    return {
      scrollDown: () => {
        // FIXME:PT avoid setTimeout()???
        setTimeout(() => {
          if (consoleWindowRef.current) {
            consoleWindowRef.current.scrollTop = consoleWindowRef.current.scrollHeight;
          }
        }, 1);
      },
    };
  }, []);

  // Anytime we add a new item to the history, scroll down so that command input remains visible
  useEffect(() => {
    if (historyItems.length) {
      scrollToBottom();
    }
  }, [historyItems.length, scrollToBottom]);

  return (
    <ConsoleWindow onClick={handleConsoleClick}>
      {/* FIXME:PT Delete ConsoleInternalContext once all code moved to using state hooks */}
      <ConsoleInternalContext.Provider value={internalServices}>
        <ConsoleStateProvider commandService={consoleService} scrollToBottom={scrollToBottom}>
          <EuiPanel className="ui-panel" panelRef={consoleWindowRef}>
            <EuiFlexGroup direction="column">
              <EuiFlexItem grow={true}>
                <OutputHistory>{historyItems}</OutputHistory>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <CommandInput
                  onExecute={handleOnExecute}
                  prompt={prompt}
                  focusRef={inputFocusRef}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </ConsoleStateProvider>
      </ConsoleInternalContext.Provider>
    </ConsoleWindow>
  );
});

Console.displayName = 'Console';
