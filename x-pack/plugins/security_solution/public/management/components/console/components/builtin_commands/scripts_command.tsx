/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { memo, useEffect } from 'react';
import { ScriptsList } from '../scripts_list';
import { useFetchScripts } from '../../hooks/use_fetch_scripts';
import type { CommandExecutionComponentProps } from '../../types';
import { HelpOutput } from '../help_output';

export const ScriptsCommand = memo<CommandExecutionComponentProps>((props) => {
  console.log({ props });
  // const scripts = useFetchScripts(props.command.agentMeta.agentId);
  const scripts = useFetchScripts(props.command.agentMeta.agentId);
  console.log({ scripts });

  useEffect(() => {
    props.setStatus('success');
  }, [props]);

  return (
    <HelpOutput
      command={props.command}
      title={i18n.translate('xpack.securitySolution.console.builtInCommands.help.helpTitle', {
        defaultMessage: 'Available commands',
      })}
    >
      {scripts && <ScriptsList scripts={scripts} />}
    </HelpOutput>
  );
});
ScriptsCommand.displayName = 'ScriptsCommand';
