/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiPanel } from '@elastic/eui';
import styled from 'styled-components';
import { OutputHistory } from './components/output_history';
import { CommandInput, CommandInputProps } from './components/command_input';
import { EuiThemeProvider } from '../../../../../../../src/plugins/kibana_react/common';
import { useConsoleService } from './components/console_provider';

// FIXME:PT implement dark mode for the console

const ConsoleWindow = styled(EuiPanel)`
  min-width: ${({ theme }) => theme.eui.euiBreakpoints.s};
  background-color: ${({ theme }) => theme.eui.euiCodeBlockBackgroundColor} !important;
  color: ${({ theme }) => theme.eui.euiCodeBlockColor} !important;

  .output {
    min-height: 300px;
  }
`;

// FIXME: PT add CommonProps to the type below
// FIXME:PT adjust list of exposed props
export type ConsoleProps = Pick<CommandInputProps, 'prompt'>;

export const Console = memo<ConsoleProps>(({ prompt }) => {
  // TODO:PT Think about how much of this is driven by props -vs- the `ConsoleProvider` context

  const consoleService = useConsoleService();

  const handleOnExecute = useCallback<CommandInputProps['onExecute']>((command) => {
    if (command.input === 'help') {
      // add help output to the command list
    }
  }, []);

  return (
    <EuiThemeProvider darkMode={true}>
      <ConsoleWindow>
        <OutputHistory className="output">history here</OutputHistory>
        <CommandInput onExecute={handleOnExecute} prompt={prompt} />
      </ConsoleWindow>
    </EuiThemeProvider>
  );
});

Console.displayName = 'Console';
