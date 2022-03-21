/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import { HistoryItem, HistoryItemComponent } from '../components/history_item';
import { HelpOutput } from '../components/help_output';
import { ParsedCommandInput } from './parsed_command_input';
import { CommandList } from '../components/command_list';
import { CommandUsage } from '../components/command_usage';
import { Command, CommandDefinition, CommandServiceInterface } from '../types';
import { BuiltinCommandServiceInterface } from './types.builtin_command_service';

const builtInCommands = (): CommandDefinition[] => {
  return [
    {
      name: 'help',
      about: i18n.translate('xpack.securitySolution.console.builtInCommands.helpAbout', {
        defaultMessage: 'View list of available commands',
      }),
    },
    {
      name: 'clear',
      about: i18n.translate('xpack.securitySolution.console.builtInCommands.clearAbout', {
        defaultMessage: 'Clear the console buffer',
      }),
    },
  ];
};

export class ConsoleBuiltinCommandsService implements BuiltinCommandServiceInterface {
  constructor(private commandList = builtInCommands()) {}

  getCommandList(): CommandDefinition[] {
    return this.commandList;
  }

  async executeCommand(command: Command): Promise<{ result: ReactNode }> {
    return {
      result: null,
    };
  }

  executeBuiltinCommand(
    parsedInput: ParsedCommandInput,
    contextConsoleService: CommandServiceInterface
  ): { result: ReturnType<HistoryItemComponent> | null; clearBuffer?: boolean } {
    switch (parsedInput.name) {
      case 'help':
        return {
          result: (
            <HistoryItem>
              <HelpOutput input={parsedInput.input} title="Available commands">
                {this.getHelpContent(parsedInput, contextConsoleService)}
              </HelpOutput>
            </HistoryItem>
          ),
        };

      case 'clear':
        return {
          result: null,
          clearBuffer: true,
        };
    }

    return { result: null };
  }

  async getHelpContent(
    parsedInput: ParsedCommandInput,
    commandService: CommandServiceInterface
  ): Promise<{ result: ReactNode }> {
    let helpOutput: ReactNode;

    if (commandService.getHelp) {
      helpOutput = (await commandService.getHelp()).result;
    } else {
      helpOutput = (
        <CommandList commands={this.commandList.concat(commandService.getCommandList())} />
      );
    }

    return {
      result: helpOutput,
    };
  }

  isBuiltin(name: string): boolean {
    return !!this.commandList.find((command) => command.name === name);
  }

  async getCommandUsage(command: CommandDefinition): Promise<{ result: ReactNode }> {
    return {
      result: <CommandUsage command={command} />,
    };
  }
}
