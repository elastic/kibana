/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { Command, CommandDefinition, ConsoleServiceInterface } from '../service/console_service';
import { builtInCommands } from './commands';
import { HistoryItem, HistoryItemComponent } from '../components/history_item';
import { HelpOutput } from '../components/help_output';
import { ParsedCommandInput } from '../service/parsed_command_input';
import { CommandList } from '../components/command_list';

export class ConsoleBuiltinCommandsService implements ConsoleServiceInterface {
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
    contextConsoleService: ConsoleServiceInterface
  ): { result: HistoryItemComponent | null; clearBuffer?: boolean } {
    switch (parsedInput.name) {
      case 'help':
        return {
          result: (
            <HistoryItem>
              {
                <HelpOutput input={parsedInput.input} title="Available commands">
                  {this.getHelpContent(parsedInput, contextConsoleService)}
                </HelpOutput>
              }
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
    consoleService: ConsoleServiceInterface
  ): Promise<{ result: ReactNode }> {
    let helpOutput: ReactNode;

    if (consoleService.getHelp) {
      helpOutput = (await consoleService.getHelp()).result;
    } else {
      helpOutput = (
        <CommandList commands={this.commandList.concat(consoleService.getCommandList())} />
      );
    }

    return {
      result: helpOutput,
    };
  }

  isBuiltin(name: string): boolean {
    return !!this.commandList.find((command) => command.name === name);
  }
}
