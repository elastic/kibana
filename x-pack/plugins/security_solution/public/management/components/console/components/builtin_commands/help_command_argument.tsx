/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect } from 'react';

import { i18n } from '@kbn/i18n';
import { CommandUsage } from '../command_usage';
import { HelpOutput } from '../help_output';
import type { CommandExecutionComponentProps } from '../../types';

/**
 * Builtin component that handles the output of command's `--help` argument
 */
export const HelpCommandArgument = memo<
  CommandExecutionComponentProps<{}, { errorMessage?: string }>
>((props) => {
  const CustomCommandHelp = props.command.commandDefinition.HelpComponent;

  useEffect(() => {
    if (!CustomCommandHelp) {
      props.setStatus('success');
    }
  }, [CustomCommandHelp, props]);

  return CustomCommandHelp ? (
    <CustomCommandHelp {...props} />
  ) : (
    <HelpOutput
      command={props.command}
      title={i18n.translate(
        'xpack.securitySolution.console.buildInCommand.helpArgument.helpTitle',
        {
          defaultMessage: '{cmdName} command',
          values: { cmdName: props.command.args.name },
        }
      )}
    >
      <CommandUsage
        commandDef={props.command.commandDefinition}
        errorMessage={props.store.errorMessage}
      />
    </HelpOutput>
  );
});
HelpCommandArgument.displayName = 'HelpCommandArgument';
