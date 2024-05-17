/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { memo, useEffect } from 'react';
import { useWithCommandList } from '../../hooks/state_selectors/use_with_command_list';
import { useWithCustomHelpComponent } from '../../hooks/state_selectors/use_with_custom_help_component';
import type { CommandExecutionComponentProps } from '../../types';
import { CommandList } from '../command_list';
import { HelpOutput } from '../help_output';

export const HelpCommand = memo<CommandExecutionComponentProps>((props) => {
  const commands = useWithCommandList();
  const CustomHelpComponent = useWithCustomHelpComponent();

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
      <CommandList commands={commands} />
    </HelpOutput>
  );
});
HelpCommand.displayName = 'HelpCommand';
