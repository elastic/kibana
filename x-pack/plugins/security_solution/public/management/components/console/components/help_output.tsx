/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode, useEffect, useState } from 'react';
import { EuiCallOut, EuiLoadingChart } from '@elastic/eui';
import { UserCommandInput } from './user_command_input';
import { CommandExecutionFailure } from './command_execution_failure';

export interface HelpOutputProps {
  input: string;
  children: ReactNode | Promise<{ result: ReactNode }>;
}
export const HelpOutput = memo<HelpOutputProps>(({ input, children }) => {
  const [content, setContent] = useState<ReactNode>(<EuiLoadingChart size="l" mono />);

  useEffect(() => {
    if (children instanceof Promise) {
      (async () => {
        try {
          setContent((await children).result);
        } catch (error) {
          setContent(<CommandExecutionFailure error={error} />);
        }
      })();

      return;
    }

    setContent(children);
  }, [children]);

  return (
    <div>
      <div>
        <UserCommandInput input={input} />
      </div>
      <EuiCallOut color="primary">{content}</EuiCallOut>
    </div>
  );
});
HelpOutput.displayName = 'HelpOutput';
