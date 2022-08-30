/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ClearCommand } from '../components/builtin_commands/clear_command';
import { HelpCommand } from '../components/builtin_commands/help_command';
import type { CommandDefinition } from '../types';

export const HELP_GROUPS = Object.freeze({
  supporting: {
    label: i18n.translate('xpack.securitySolution.console.builtInCommands.groups.supporting', {
      defaultMessage: 'Supporting commands & parameters',
    }),
  },
});

export const COMMON_ARGS = Object.freeze([
  {
    name: '--comment',
    about: i18n.translate('xpack.securitySolution.console.commandList.commonArgs.comment', {
      defaultMessage: 'Add comment to any action Ex: isolate --comment your comment',
    }),
  },
  {
    name: '--help',
    about: i18n.translate('xpack.securitySolution.console.commandList.commonArgs.help', {
      defaultMessage: 'Command assistance Ex: isolate --help',
    }),
  },
]);

export const getBuiltinCommands = (): CommandDefinition[] => {
  return [
    {
      name: 'help',
      about: i18n.translate('xpack.securitySolution.console.builtInCommands.helpAbout', {
        defaultMessage: 'List all available commands',
      }),
      RenderComponent: HelpCommand,
      helpGroupLabel: HELP_GROUPS.supporting.label,
      helpCommandPosition: 1,
    },
    {
      name: 'clear',
      about: i18n.translate('xpack.securitySolution.console.builtInCommands.clearAbout', {
        defaultMessage: 'Clear console screen',
      }),
      RenderComponent: ClearCommand,
      helpGroupLabel: HELP_GROUPS.supporting.label,
      helpCommandPosition: 0,
    },
  ];
};
