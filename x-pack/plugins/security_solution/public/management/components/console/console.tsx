/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiPanel } from '@elastic/eui';
import { OutputHistory } from './components/output_history';
import { CommandInput } from './components/command_input';

export const Console = memo(() => {
  return (
    <EuiPanel>
      <OutputHistory>history here</OutputHistory>
      <CommandInput>input</CommandInput>
    </EuiPanel>
  );
});

Console.displayName = 'Console';
