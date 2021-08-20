/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiPanel } from '@elastic/eui';
import styled from 'styled-components';
import { OutputHistory } from './components/output_history';
import { CommandInput } from './components/command_input';
import { EuiThemeProvider } from '../../../../../../../src/plugins/kibana_react/common';

// FIXME:PT implement dark mode for the console

const ConsoleWindow = styled(EuiPanel)`
  min-width: ${({ theme }) => theme.eui.euiBreakpoints.s};

  .output {
    min-height: 300px;
  }
`;

export const Console = memo(() => {
  return (
    <EuiThemeProvider darkMode={true}>
      <ConsoleWindow>
        <OutputHistory className="output">history here</OutputHistory>
        <CommandInput>input</CommandInput>
      </ConsoleWindow>
    </EuiThemeProvider>
  );
});

Console.displayName = 'Console';
