/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { memo, useMemo, useEffect } from 'react';
import { CommandList } from '../command_list';
import { useCommandService } from '../../hooks/state_selectors/use_command_service';
import { CommandExecutionComponentProps } from '../../types';
import { HelpOutput } from '../help_output';
import { useBuiltinCommandService } from '../../hooks/state_selectors/use_builtin_command_service';

export const HelpCommand = memo<CommandExecutionComponentProps>((props) => {
  const builtinCommandService = useBuiltinCommandService();
  const commandService = useCommandService();

  const CustomHelpComponent = commandService.HelpComponent;

  const allCommands = useMemo(() => {
    return builtinCommandService.getCommandList().concat(commandService.getCommandList());
  }, [builtinCommandService, commandService]);

  useEffect(() => {
    if (!CustomHelpComponent) {
      props.setStatus('success');
    }
  }, [CustomHelpComponent, props]);

  return CustomHelpComponent ? (
    <CustomHelpComponent {...props} />
  ) : (
    <HelpOutput
      command={props.command}
      title={i18n.translate('xpack.securitySolution.console.builtInCommands.help.helpTitle', {
        defaultMessage: 'Available commands',
      })}
    >
      <CommandList commands={allCommands} />
    </HelpOutput>
  );
});
HelpCommand.displayName = 'HelpCommand';
