/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ConsoleDataAction, ConsoleStoreReducer } from '../types';
import { parseCommandInput } from '../../../service/parsed_command_input';
import { HistoryItem } from '../../history_item';
import { UnknownCommand } from '../../unknow_comand';
import { HelpOutput } from '../../help_output';
import { BadArgument } from '../../bad_argument';
import { CommandExecutionOutput } from '../../command_execution_output';

export const handleExecuteCommand: ConsoleStoreReducer<
  ConsoleDataAction & { type: 'executeCommand' }
> = (state, action) => {
  const parsedInput = parseCommandInput(action.payload.input);

  if (parsedInput.name === '') {
    return state;
  }

  const commandService = state.commandService;

  // FIXME:PT this should be set to teh internal command service once available
  const builtinCommandService = state.commandService;

  // FIXME:PT Handle internal command
  // Is it an internal command?
  // if (builtinCommandService.isBuiltin(parsedInput.name)) {
  //   const commandOutput = builtinCommandService.executeBuiltinCommand(
  //     parsedInput,
  //     consoleService
  //   );
  //
  //   if (commandOutput.clearBuffer) {
  //     setHistoryItems([]);
  //   } else {
  //     setHistoryItems((prevState) => {
  //       return [...prevState, commandOutput.result];
  //     });
  //   }
  //
  //   return;
  // }

  // Validate and execute the defined command

  const commandDefinition = commandService
    .getCommandList()
    .find((definition) => definition.name === parsedInput.name);

  // Unknown command
  if (!commandDefinition) {
    return {
      ...state,
      commandHistory: [
        ...state.commandHistory,

        <HistoryItem>
          <UnknownCommand input={parsedInput.input} />
        </HistoryItem>,
      ],
    };
  }

  // FIXME:PT the validation checks below should be lifted and centralized so that they can be reused (in builtinCommands)

  // If args were entered, then validate them
  if (parsedInput.hasArgs()) {
    if (parsedInput.hasArg('help')) {
      return {
        ...state,
        commandHistory: [
          ...state.commandHistory,
          <HistoryItem>
            <HelpOutput input={parsedInput.input} title={`${parsedInput.name} command`}>
              {(commandService.getCommandUsage || builtinCommandService.getCommandUsage)(
                commandDefinition
              )}
            </HelpOutput>
          </HistoryItem>,
        ],
      };
    }

    // Command support no arguments
    if (!commandDefinition.args) {
      return {
        ...state,
        commandHistory: [
          ...state.commandHistory,
          <HistoryItem>
            <BadArgument parsedInput={parsedInput} commandDefinition={commandDefinition}>
              {/* FIXME: i18n this */}
              {'command does not support any arguments'}
            </BadArgument>
          </HistoryItem>,
        ],
      };
    }

    // unknown arguments?
    if (parsedInput.unknownArgs && parsedInput.unknownArgs.length) {
      return {
        ...state,
        commandHistory: [
          ...state.commandHistory,
          <HistoryItem>
            <BadArgument parsedInput={parsedInput} commandDefinition={commandDefinition}>
              {/* FIXME: i18n this */}
              {`unknown argument(s): ${parsedInput.unknownArgs.join(', ')}`}
            </BadArgument>
          </HistoryItem>,
        ],
      };
    }

    // unsupported arguments
    for (const argName of Object.keys(parsedInput.args)) {
      if (!commandDefinition.args[argName]) {
        return {
          ...state,
          commandHistory: [
            ...state.commandHistory,
            <HistoryItem>
              <BadArgument parsedInput={parsedInput} commandDefinition={commandDefinition}>
                {/* FIXME: i18n this */}
                {`unsupported argument: ${argName}`}
              </BadArgument>
            </HistoryItem>,
          ],
        };
      }

      // FIXME:PT implement validation of arguments `allowMultiples`

      // FIXME:PT implement validation of required arguments

      // FIXME:PT Implement calling validator
    }
  } else if (commandDefinition.mustHaveArgs) {
    return {
      ...state,
      commandHistory: [
        ...state.commandHistory,
        <HistoryItem>
          <BadArgument parsedInput={parsedInput} commandDefinition={commandDefinition}>
            {/* FIXME: i18n this */}
            {'at least 1 argument must be used'}
          </BadArgument>
        </HistoryItem>,
      ],
    };
  }

  // All is good. Execute the command
  return {
    ...state,
    commandHistory: [
      ...state.commandHistory,
      <HistoryItem>
        <CommandExecutionOutput
          command={{
            input: parsedInput.input,
            args: parsedInput,
            commandDefinition,
          }}
        />
      </HistoryItem>,
    ],
  };
};
