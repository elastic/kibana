/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint complexity: ["error", 40]*/
// FIXME:PT remove the complexity

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ConsoleDataAction, ConsoleDataState, ConsoleStoreReducer } from '../types';
import { parseCommandInput } from '../../../service/parsed_command_input';
import { HistoryItem } from '../../history_item';
import { UnknownCommand } from '../../unknow_comand';
import { HelpOutput } from '../../help_output';
import { BadArgument } from '../../bad_argument';
import { CommandExecutionOutput } from '../../command_execution_output';
import { CommandDefinition } from '../../../types';

const toCliArgumentOption = (argName: string) => `--${argName}`;

const getRequiredArguments = (argDefinitions: CommandDefinition['args']): string[] => {
  if (!argDefinitions) {
    return [];
  }

  return Object.entries(argDefinitions)
    .filter(([_, argDef]) => argDef.required)
    .map(([argName]) => argName);
};

const updateStateWithNewCommandHistoryItem = (
  state: ConsoleDataState,
  newHistoryItem: ConsoleDataState['commandHistory'][number]
): ConsoleDataState => {
  return {
    ...state,
    commandHistory: [...state.commandHistory, newHistoryItem],
  };
};

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

    return updateStateWithNewCommandHistoryItem(state, commandOutput.result);
  }

  // ----------------------------------------------------
  // Validate and execute the user defined command
  // ----------------------------------------------------
  const commandDefinition = commandService
    .getCommandList()
    .find((definition) => definition.name === parsedInput.name);

  // Unknown command
  if (!commandDefinition) {
    return updateStateWithNewCommandHistoryItem(
      state,
      <HistoryItem>
        <UnknownCommand input={parsedInput.input} />
      </HistoryItem>
    );
  }

  const requiredArgs = getRequiredArguments(commandDefinition.args);

  // If args were entered, then validate them
  if (parsedInput.hasArgs()) {
    // Show command help
    if (parsedInput.hasArg('help')) {
      return updateStateWithNewCommandHistoryItem(
        state,
        <HistoryItem>
          <HelpOutput
            input={parsedInput.input}
            title={i18n.translate('xpack.securitySolution.console.commandValidation.cmdHelpTitle', {
              defaultMessage: '{cmdName} command',
              values: { cmdName: parsedInput.name },
            })}
          >
            {(commandService.getCommandUsage || builtinCommandService.getCommandUsage)(
              commandDefinition
            )}
          </HelpOutput>
        </HistoryItem>
      );
    }

    // Command supports no arguments
    if (!commandDefinition.args || Object.keys(commandDefinition.args).length === 0) {
      return updateStateWithNewCommandHistoryItem(
        state,
        <HistoryItem>
          <BadArgument parsedInput={parsedInput} commandDefinition={commandDefinition}>
            {i18n.translate(
              'xpack.securitySolution.console.commandValidation.noArgumentsSupported',
              {
                defaultMessage: 'command does not support any arguments',
              }
            )}
          </BadArgument>
        </HistoryItem>
      );
    }

    // no unknown arguments allowed?
    if (parsedInput.unknownArgs && parsedInput.unknownArgs.length) {
      return updateStateWithNewCommandHistoryItem(
        state,
        <HistoryItem>
          <BadArgument parsedInput={parsedInput} commandDefinition={commandDefinition}>
            {i18n.translate('xpack.securitySolution.console.commandValidation.unknownArgument', {
              defaultMessage: 'unknown argument(s): {unknownArgs}',
              values: {
                unknownArgs: parsedInput.unknownArgs.join(', '),
              },
            })}
          </BadArgument>
        </HistoryItem>
      );
    }

    // Missing required Arguments
    for (const requiredArg of requiredArgs) {
      if (!parsedInput.args[requiredArg]) {
        return updateStateWithNewCommandHistoryItem(
          state,
          <HistoryItem>
            <BadArgument parsedInput={parsedInput} commandDefinition={commandDefinition}>
              {i18n.translate(
                'xpack.securitySolution.console.commandValidation.missingRequiredArg',
                {
                  defaultMessage: 'missing required argument: {argName}',
                  values: {
                    argName: toCliArgumentOption(requiredArg),
                  },
                }
              )}
            </BadArgument>
          </HistoryItem>
        );
      }
    }

    // Validate each argument given to the command
    for (const argName of Object.keys(parsedInput.args)) {
      const argDefinition = commandDefinition.args[argName];
      const argInput = parsedInput.args[argName];

      // Unknown argument
      if (!argDefinition) {
        return updateStateWithNewCommandHistoryItem(
          state,
          <HistoryItem>
            <BadArgument parsedInput={parsedInput} commandDefinition={commandDefinition}>
              {i18n.translate('xpack.securitySolution.console.commandValidation.unsupportedArg', {
                defaultMessage: 'unsupported argument: {argName}',
                values: { argName: toCliArgumentOption(argName) },
              })}
            </BadArgument>
          </HistoryItem>
        );
      }

      // does not allow multiple values
      if (
        !argDefinition.allowMultiples &&
        Array.isArray(argInput.values) &&
        argInput.values.length > 0
      ) {
        return updateStateWithNewCommandHistoryItem(
          state,
          <HistoryItem>
            <BadArgument parsedInput={parsedInput} commandDefinition={commandDefinition}>
              {i18n.translate(
                'xpack.securitySolution.console.commandValidation.argSupportedOnlyOnce',
                {
                  defaultMessage: 'argument can only be used once: {argName}',
                  values: { argName: toCliArgumentOption(argName) },
                }
              )}
            </BadArgument>
          </HistoryItem>
        );
      }

      if (argDefinition.validate) {
        const validationResult = argDefinition.validate(argInput);

        if (validationResult !== true) {
          return updateStateWithNewCommandHistoryItem(
            state,
            <HistoryItem>
              <BadArgument parsedInput={parsedInput} commandDefinition={commandDefinition}>
                {i18n.translate(
                  'xpack.securitySolution.console.commandValidation.invalidArgValue',
                  {
                    defaultMessage: 'invalid argument value: {argName}. {error}',
                    values: { argName: toCliArgumentOption(argName), error: validationResult },
                  }
                )}
              </BadArgument>
            </HistoryItem>
          );
        }
      }
    }
  } else if (requiredArgs.length > 0) {
    return updateStateWithNewCommandHistoryItem(
      state,
      <HistoryItem>
        <BadArgument parsedInput={parsedInput} commandDefinition={commandDefinition}>
          {i18n.translate('xpack.securitySolution.console.commandValidation.mustHaveArgs', {
            defaultMessage: 'missing required arguments: {requiredArgs}',
            values: {
              requiredArgs: requiredArgs.map((argName) => toCliArgumentOption(argName)).join(', '),
            },
          })}
        </BadArgument>
      </HistoryItem>
    );
  } else if (commandDefinition.mustHaveArgs) {
    return updateStateWithNewCommandHistoryItem(
      state,
      <HistoryItem>
        <BadArgument parsedInput={parsedInput} commandDefinition={commandDefinition}>
          {i18n.translate('xpack.securitySolution.console.commandValidation.oneArgIsRequired', {
            defaultMessage: 'at least one argument must be used',
          })}
        </BadArgument>
      </HistoryItem>
    );
  }

  // All is good. Execute the command
  return updateStateWithNewCommandHistoryItem(
    state,
    <HistoryItem>
      <CommandExecutionOutput
        command={{
          input: parsedInput.input,
          args: parsedInput,
          commandDefinition,
        }}
      />
    </HistoryItem>
  );
};
