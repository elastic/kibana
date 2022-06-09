/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { v4 as uuidV4 } from 'uuid';
import { HelpCommandArgument } from '../../builtin_commands/help_command_argument';
import {
  CommandHistoryItem,
  ConsoleDataAction,
  ConsoleDataState,
  ConsoleStoreReducer,
} from '../types';
import { parseCommandInput, ParsedCommandInterface } from '../../../service/parsed_command_input';
import { UnknownCommand } from '../../unknow_comand';
import { BadArgument } from '../../bad_argument';
import { Command, CommandDefinition, CommandExecutionComponentProps } from '../../../types';

const toCliArgumentOption = (argName: string) => `--${argName}`;

const getRequiredArguments = (argDefinitions: CommandDefinition['args']): string[] => {
  if (!argDefinitions) {
    return [];
  }

  return Object.entries(argDefinitions)
    .filter(([_, argDef]) => argDef.required)
    .map(([argName]) => argName);
};

const getUnknownArguments = (
  inputArgs: ParsedCommandInterface['args'],
  argDefinitions: CommandDefinition['args'] | undefined
): string[] => {
  const response: string[] = [];

  Object.keys(inputArgs).forEach((argName) => {
    if (!argDefinitions || !argDefinitions[argName]) {
      response.push(argName);
    }
  });

  return response;
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

const UnknownCommandDefinition: CommandDefinition = {
  name: 'unknown-command',
  about: 'unknown command',
  RenderComponent: () => null,
};

const createCommandExecutionState = (
  store: CommandExecutionComponentProps['store'] = {}
): CommandHistoryItem['state'] => {
  return {
    status: 'pending',
    store,
  };
};

const cloneCommandDefinitionWithNewRenderComponent = (
  command: Command,
  RenderComponent: CommandDefinition['RenderComponent']
): Command => {
  return {
    ...command,
    commandDefinition: {
      ...command.commandDefinition,
      // We use the original command definition, but replace
      // the RenderComponent for this invocation
      RenderComponent,
    },
  };
};

export const handleExecuteCommand: ConsoleStoreReducer<
  ConsoleDataAction & { type: 'executeCommand' }
> = (state, action) => {
  const parsedInput = parseCommandInput(action.payload.input);

  if (parsedInput.name === '') {
    return state;
  }

  const { commands } = state;
  const commandDefinition: CommandDefinition | undefined = commands.find(
    (definition) => definition.name === parsedInput.name
  );

  // Unknown command
  if (!commandDefinition) {
    return updateStateWithNewCommandHistoryItem(state, {
      id: uuidV4(),
      command: {
        input: parsedInput.input,
        args: parsedInput,
        commandDefinition: {
          ...UnknownCommandDefinition,
          RenderComponent: UnknownCommand,
        },
      },
      state: createCommandExecutionState(),
    });
  }

  const command = {
    input: parsedInput.input,
    args: parsedInput,
    commandDefinition,
  };
  const requiredArgs = getRequiredArguments(commandDefinition.args);

  // If args were entered, then validate them
  if (parsedInput.hasArgs()) {
    // Show command help
    if (parsedInput.hasArg('help')) {
      return updateStateWithNewCommandHistoryItem(state, {
        id: uuidV4(),
        command: cloneCommandDefinitionWithNewRenderComponent(command, HelpCommandArgument),
        state: createCommandExecutionState(),
      });
    }

    // Command supports no arguments
    if (!commandDefinition.args || Object.keys(commandDefinition.args).length === 0) {
      return updateStateWithNewCommandHistoryItem(state, {
        id: uuidV4(),
        command: cloneCommandDefinitionWithNewRenderComponent(command, BadArgument),
        state: createCommandExecutionState({
          errorMessage: i18n.translate(
            'xpack.securitySolution.console.commandValidation.noArgumentsSupported',
            {
              defaultMessage: 'command does not support any arguments',
            }
          ),
        }),
      });
    }

    // no unknown arguments allowed?
    const unknownInputArgs = getUnknownArguments(parsedInput.args, commandDefinition.args);

    if (unknownInputArgs.length) {
      return updateStateWithNewCommandHistoryItem(state, {
        id: uuidV4(),
        command: cloneCommandDefinitionWithNewRenderComponent(command, BadArgument),
        state: createCommandExecutionState({
          errorMessage: i18n.translate(
            'xpack.securitySolution.console.commandValidation.unknownArgument',
            {
              defaultMessage: 'unknown argument(s): {unknownArgs}',
              values: {
                unknownArgs: unknownInputArgs.join(', '),
              },
            }
          ),
        }),
      });
    }

    // Missing required Arguments
    for (const requiredArg of requiredArgs) {
      if (!parsedInput.args[requiredArg]) {
        return updateStateWithNewCommandHistoryItem(state, {
          id: uuidV4(),
          command: cloneCommandDefinitionWithNewRenderComponent(command, BadArgument),
          state: createCommandExecutionState({
            errorMessage: i18n.translate(
              'xpack.securitySolution.console.commandValidation.missingRequiredArg',
              {
                defaultMessage: 'missing required argument: {argName}',
                values: {
                  argName: toCliArgumentOption(requiredArg),
                },
              }
            ),
          }),
        });
      }
    }

    // Validate each argument given to the command
    for (const argName of Object.keys(parsedInput.args)) {
      const argDefinition = commandDefinition.args[argName];
      const argInput = parsedInput.args[argName];

      // Unknown argument
      if (!argDefinition) {
        return updateStateWithNewCommandHistoryItem(state, {
          id: uuidV4(),
          command: cloneCommandDefinitionWithNewRenderComponent(command, BadArgument),
          state: createCommandExecutionState({
            errorMessage: i18n.translate(
              'xpack.securitySolution.console.commandValidation.unsupportedArg',
              {
                defaultMessage: 'unsupported argument: {argName}',
                values: { argName: toCliArgumentOption(argName) },
              }
            ),
          }),
        });
      }

      // does not allow multiple values
      if (
        !argDefinition.allowMultiples &&
        Array.isArray(argInput.values) &&
        argInput.values.length > 0
      ) {
        return updateStateWithNewCommandHistoryItem(state, {
          id: uuidV4(),
          command: cloneCommandDefinitionWithNewRenderComponent(command, BadArgument),
          state: createCommandExecutionState({
            errorMessage: i18n.translate(
              'xpack.securitySolution.console.commandValidation.argSupportedOnlyOnce',
              {
                defaultMessage: 'argument can only be used once: {argName}',
                values: { argName: toCliArgumentOption(argName) },
              }
            ),
          }),
        });
      }

      if (argDefinition.validate) {
        const validationResult = argDefinition.validate(argInput);

        if (validationResult !== true) {
          return updateStateWithNewCommandHistoryItem(state, {
            id: uuidV4(),
            command: cloneCommandDefinitionWithNewRenderComponent(command, BadArgument),
            state: createCommandExecutionState({
              errorMessage: i18n.translate(
                'xpack.securitySolution.console.commandValidation.invalidArgValue',
                {
                  defaultMessage: 'invalid argument value: {argName}. {error}',
                  values: { argName: toCliArgumentOption(argName), error: validationResult },
                }
              ),
            }),
          });
        }
      }
    }
  } else if (requiredArgs.length > 0) {
    return updateStateWithNewCommandHistoryItem(state, {
      id: uuidV4(),
      command: cloneCommandDefinitionWithNewRenderComponent(command, BadArgument),
      state: createCommandExecutionState({
        errorMessage: i18n.translate(
          'xpack.securitySolution.console.commandValidation.mustHaveArgs',
          {
            defaultMessage: 'missing required arguments: {requiredArgs}',
            values: {
              requiredArgs: requiredArgs.map((argName) => toCliArgumentOption(argName)).join(', '),
            },
          }
        ),
      }),
    });
  } else if (commandDefinition.mustHaveArgs) {
    return updateStateWithNewCommandHistoryItem(state, {
      id: uuidV4(),
      command: cloneCommandDefinitionWithNewRenderComponent(command, BadArgument),
      state: createCommandExecutionState({
        errorMessage: i18n.translate(
          'xpack.securitySolution.console.commandValidation.oneArgIsRequired',
          {
            defaultMessage: 'at least one argument must be used',
          }
        ),
      }),
    });
  }

  // All is good. Execute the command
  return updateStateWithNewCommandHistoryItem(state, {
    id: uuidV4(),
    command,
    state: createCommandExecutionState(),
  });
};
