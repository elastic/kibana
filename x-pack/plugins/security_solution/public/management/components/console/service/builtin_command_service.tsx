/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { HelpCommand } from '../components/builtin_commands/help_command';
import { CommandDefinition } from '../types';
import { BuiltinCommandServiceInterface } from './types.builtin_command_service';

export class ConsoleBuiltinCommandsService implements BuiltinCommandServiceInterface {
  private readonly commandList: CommandDefinition[];

  constructor() {
    this.commandList = [
      {
        name: 'help',
        about: i18n.translate('xpack.securitySolution.console.builtInCommands.helpAbout', {
          defaultMessage: 'View list of available commands',
        }),
        RenderComponent: HelpCommand,
      },
      {
        name: 'clear',
        about: i18n.translate('xpack.securitySolution.console.builtInCommands.clearAbout', {
          defaultMessage: 'Clear the console buffer',
        }),
        // FIXME:PT Implement
        RenderComponent: () => {
          return null;
        },
      },
    ];
  }

  getCommandList(): CommandDefinition[] {
    return this.commandList;
  }

  isBuiltin(name: string): boolean {
    return !!this.commandList.find((command) => command.name === name);
  }

  getCommandDefinition(commandName: string) {
    return this.commandList.find(
      (definition: CommandDefinition): boolean => definition.name === commandName
    );
  }
}
