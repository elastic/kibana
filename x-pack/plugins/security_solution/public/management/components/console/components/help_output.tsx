/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, PropsWithChildren } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { UserCommandInput } from './user_command_input';

export type HelpOutputProps = PropsWithChildren<{ input: string }>;
export const HelpOutput = memo<HelpOutputProps>(({ input, children }) => {
  return (
    <div>
      <div>
        <UserCommandInput input={input} />
      </div>
      <EuiCallOut color="primary">{children}</EuiCallOut>
    </div>
  );
});
HelpOutput.displayName = 'HelpOutput';
