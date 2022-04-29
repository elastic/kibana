/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { memo } from 'react';
import { CommandList } from '../command_list';
import { useCommandService } from '../../hooks/state_selectors/use_command_service';
import { CommandExecutionComponentProps } from '../../types';
import { HelpOutput } from '../help_output';
import { useBuiltinCommandService } from '../../hooks/state_selectors/use_builtin_command_service';

export const HelpCommand = memo<CommandExecutionComponentProps>((props) => {
  const builtinCommandService = useBuiltinCommandService();
  const commandService = useCommandService();

  return (
    <HelpOutput
      input={props.command.args.input}
      title={i18n.translate('xpack.securitySolution.console.builtInCommands.allCommands', {
        defaultMessage: 'Available commands',
      })}
    >
      <CommandList
        commands={builtinCommandService.getCommandList().concat(commandService.getCommandList())}
      />
      {/* TODO:PT need to get help from command service if it defines a method for it.      */}
    </HelpOutput>
  );
});
HelpCommand.displayName = 'HelpCommand';
