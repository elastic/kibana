/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
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

  const { commandService, builtinCommandService } = state;

  // Is it an internal command?
  if (builtinCommandService.isBuiltin(parsedInput.name)) {
    const commandOutput = builtinCommandService.executeBuiltinCommand(parsedInput, commandService);

    if (commandOutput.clearBuffer) {
      return {
        ...state,
        commandHistory: [],
      };
    }

    return {
      ...state,
      commandHistory: [...state.commandHistory, commandOutput.result],
    };
  }

  // ----------------------------------------------------
  // Validate and execute the user defined command
  // ----------------------------------------------------
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
              {i18n.translate(
                'xpack.securitySolution.console.commandValidation.noArgumentsSupported',
                {
                  defaultMessage: 'command does not support any arguments',
                }
              )}
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
              {i18n.translate('xpack.securitySolution.console.commandValidation.unknownArgument', {
                defaultMessage: 'unknown argument(s): {unknownArgs}',
                values: {
                  unknownArgs: parsedInput.unknownArgs.join(', '),
                },
              })}
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
                {i18n.translate('xpack.securitySolution.console.commandValidation.unsupportedArg', {
                  defaultMessage: 'unsupported argument: {argName}',
                  values: { argName },
                })}
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
            {i18n.translate('xpack.securitySolution.console.commandValidation.oneArgIsRequred', {
              defaultMessage: 'at least one argument must be used',
            })}
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
