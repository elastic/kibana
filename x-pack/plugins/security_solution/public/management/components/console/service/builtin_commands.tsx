/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ClearCommand } from '../components/builtin_commands/clear_command';
import { HelpCommand } from '../components/builtin_commands/help_command';
import { CommandDefinition } from '../types';

export const getBuiltinCommands = (): CommandDefinition[] => {
  return [
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
      RenderComponent: ClearCommand,
    },
  ];
};
